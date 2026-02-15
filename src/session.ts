import { Toast } from "@capacitor/toast";
import throttle from "lodash-es/throttle";
import redraw from "./utils/redraw";
import signals from "./signals";
import { ErrorResponse, SESSION_ID_KEY, fetchJSON, fetchText } from "./http";
import { hasNetwork, handleXhrError, serializeQueryParameters } from "./utils";
import { getAtPath, setAtPath, pick } from "./utils/object";
import i18n from "./i18n";
import settings, { Prop } from "./settings";
import { TempBan, LobbyData, NowPlayingGame } from "./lichess/interfaces";
import { PlayTime, Perfs } from "./lichess/interfaces/user";
import friendsApi from "./lichess/friends";
import { PrefValue } from "./lichess/prefs";
import challengesApi from "./lichess/challenges";
import storage from "./storage";
import announce, { Announcement } from "./announce";
import { getSdk } from "./sdk";
import { Player } from "ysdk";

interface Prefs {
    [key: string]: PrefValue;
}

export type EmailConfirm = { email_confirm: boolean };
export type SignupData = Session | EmailConfirm;

export interface Profile {
    readonly country?: string;
    readonly location?: string;
    readonly bio?: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly fideRating?: number;
    readonly links?: string;
}

export interface Session {
    readonly id: string;
    readonly username: string;
    readonly title?: string;
    readonly online: boolean;
    readonly tosViolation?: boolean;
    readonly troll?: boolean;
    readonly kid: boolean;
    readonly patron: boolean;
    readonly language?: string;
    readonly profile?: Profile;
    readonly perfs: Perfs;
    readonly createdAt: number;
    readonly seenAt: number;
    readonly playTime: PlayTime;
    readonly nowPlaying: ReadonlyArray<NowPlayingGame>;
    readonly prefs: Prefs;
    readonly nbChallenges: number;
    readonly nbFollowers: number;
    readonly playban?: TempBan;
    // sent on login/signup only
    readonly sessionId?: string;
    readonly announce?: Announcement;
}

let session: Session | undefined;

function isConnected(): boolean {
    return session !== undefined;
}

function getSession(): Session | undefined {
    return session;
}

// store session data for offline usage
function storeSession(d: Session): void {
    storage.set("session", d);
}

// clear session data stored in async storage and sessionId
function onLogout(): void {
    storage.remove("session");
    storage.remove(SESSION_ID_KEY);
    signals.afterLogout.dispatch();
}

function restoreStoredSession(): void {
    storage.get<Session>("session").then((d) => {
        session = d || undefined;
        if (d !== null) {
            signals.sessionRestored.dispatch();
            redraw();
        }
    });
}

function getUserId(): string | undefined {
    return session && session.id;
}

function nowPlaying(): readonly NowPlayingGame[] {
    const np = (session && session.nowPlaying) || [];
    return np.filter(
        (e) => settings.game.supportedVariants.indexOf(e.variant.key) !== -1
    );
}

function isKidMode(): boolean {
    return !!(session && session.kid);
}

function isShadowban(): boolean {
    return !!(session && session.troll);
}

function myTurnGames(): readonly NowPlayingGame[] {
    return nowPlaying().filter((e) => e.isMyTurn);
}

function showSavedPrefToast(data: string): string {
    Toast.show({
        text: "✓ chess-online.com: " + i18n("yourPreferencesHaveBeenSaved"),
        position: "center",
        duration: "short",
    });
    return data;
}

function setKidMode(v: boolean, data: Record<string, string>): Promise<void> {
    return fetchText(
        `/account/kid?v=${v}`,
        {
            method: "POST",
            body: new URLSearchParams(data),
            headers: {
                "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                Accept: "application/json, text/*",
            },
        },
        true
    ).then(refresh);
}

function numValue(v: string | boolean | number): string {
    if (v === true) return "1";
    else if (v === false) return "0";
    else return String(v);
}

function makeReducer(prefix: string) {
    return function (acc: Partial<Prefs>, [k, v]: [string, PrefValue]) {
        return {
            ...acc,
            [prefix + k]: numValue(v),
        };
    };
}

const savePreferences = throttle((): Promise<string> => {
    const prefs = (session && session.prefs) || {};

    const display = Object.entries(
        pick(prefs, [
            "animation",
            "captured",
            "highlight",
            "destination",
            "coords",
            "replay",
            "blindfold",
        ])
    ).reduce(makeReducer("display."), {}) as Record<string, string>;

    const behavior = Object.entries(
        pick(prefs, [
            "premove",
            "takeback",
            "autoQueen",
            "autoThreefold",
            "submitMove",
            "confirmResign",
            "moretime",
        ])
    ).reduce(makeReducer("behavior."), {}) as Record<string, string>;

    const rest = Object.entries(
        pick(prefs, [
            "clockTenths",
            "clockBar",
            "clockSound",
            "follow",
            "challenge",
            "message",
            "insightShare",
        ])
    ).reduce(makeReducer(""), {}) as Record<string, string>;

    return fetchText(
        "/account/preferences",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                Accept: "application/json, text/*",
            },
            body: serializeQueryParameters({ ...rest, ...display, ...behavior }),
        },
        true
    ).then(showSavedPrefToast);
}, 1000);

function lichessBackedProp<T extends PrefValue>(
    path: string,
    defaultVal: T
): Prop<T> {
    return function (...args: unknown[]) {
        if (args.length) {
            let oldPref: T;
            if (session) {
                oldPref = <T>getAtPath(session, path);
                setAtPath(session, path, args[0]);
            }
            savePreferences().catch((err) => {
                if (session) setAtPath(session, path, oldPref);
                if (hasNetwork()) handleXhrError(err);
            });
        }

        return session ? <T>getAtPath(session, path) : defaultVal;
    };
}

function isSession(data: Session | LobbyData | SignupData): data is Session {
    return (<Session>data).id !== undefined;
}

let playerInstance: Player;

async function initPlayer(force = false) {
    if (playerInstance && !force) {
        return playerInstance;
    }
    
    const ysdk = getSdk();
    playerInstance = await ysdk.getPlayer();
    return playerInstance;
}

async function loginInternal(): Promise<Session> {
    const ysdk = getSdk();
    const signatured = await ysdk.getPlayer({ signed: true });
    const signature = encodeURIComponent(signatured.signature);
    return fetchJSON<Session | LobbyData>(`/login?signature=${signature}&provider=yandex-game`, {method: "GET"},true)
        .then((data) => {
            if (isSession(data)) {
                session = data;
                if (session.sessionId) {
                    storage.set(SESSION_ID_KEY, session.sessionId);
                }
                storeSession(data);
                return session;
            } else {
                throw { ipban: true };
            }
        });
}

async function autologin() {
    const player = await initPlayer();
    if (player.isAuthorized()) {
        await loginInternal();
    }
}

async function login(): Promise<boolean> {
    // Initialize the player
    const player = await initPlayer();

    // Check if player is authorized in YSDK
    if (!player.isAuthorized()) {
        try {
            // Player is not authorized, call authorization dialog
            const ysdk = getSdk();
            await ysdk.auth.openAuthDialog();

            // Re-initialize player after successful authorization
            await initPlayer(true);
        } catch (err) {
            // Authorization was not successful, abort the process
            console.warn('Authorization failed:', err);
            return false;
        }
    }

    // Call loginInternal to authenticate on the server
    return !!(await loginInternal());
}

async function logout() {
  try {
        await fetchJSON("/logout", { method: "POST" }, true);
        session = undefined;
        onLogout();
        friendsApi.clear();
        redraw();
    } catch (error) {
        return handleXhrError(error as ErrorResponse);
    }
}

async function confirmEmail(token: string): Promise<Session> {
    const data = await fetchJSON<Session>(`/signup/confirm/${token}`, undefined, true);
    session = data;
    storeSession(data);
    return session;
}

async function rememberLogin(): Promise<Session> {
    const data = await fetchJSON<Session>("/account/info");
    session = data;
    storeSession(data);
    return data;
}

async function refresh(): Promise<void> {
    try {
        const data = await fetchJSON<Session>("/account/info", { cache: "reload" });
        session = data;
        storeSession(data);
        announce.set(data.announce);
        // if server tells me, reload challenges
        if (session.nbChallenges !== challengesApi.incoming().length) {
            challengesApi.refresh().then(redraw);
        }
        redraw();
    } catch (err: any) {
        if (session !== undefined && err.status === 401) {
            session = undefined;
            onLogout();
            redraw();
            Toast.show({
                text: "You have been signed out",
                position: "center",
                duration: "short",
            });
        }
    }
}

async function backgroundRefresh(): Promise<void> {
    if (hasNetwork() && isConnected()) {
        const data = await fetchJSON<Session>("/account/info");
        session = data;
        storeSession(data);
        announce.set(data.announce);
        // if server tells me, reload challenges
        if (session.nbChallenges !== challengesApi.incoming().length) {
            challengesApi.refresh().then(redraw);
        }
    }
}

export default {
    isConnected,
    isKidMode,
    isShadowban,
    logout,
    login: throttle(login, 1000),
    rememberLogin: throttle(rememberLogin, 1000),
    autologin,
    restoreStoredSession,
    refresh: throttle(refresh, 1000),
    backgroundRefresh: throttle(backgroundRefresh, 1000),
    get: getSession,
    getUserId,
    appUser(fallback: string): string {
        if (session) return session && session.username;
        else return fallback;
    },
    nowPlaying,
    myTurnGames,
    lichessBackedProp,
    setKidMode,
    confirmEmail,
    hasCurrentBan(): boolean {
        return session?.playban !== undefined;
    },
};
