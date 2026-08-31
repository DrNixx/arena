# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это за проект

Форк [lichobile](https://github.com/lichess-org/lichobile) 8.x (мобильное приложение lichess на Capacitor),
переделанный в **браузерное приложение для Yandex.Games**. Ветка разработки — `yandex`, базовая ветка форка —
`chess-online` (не `master`).

Бэкенд — собственный форк lila на `https://live.chess-online.com` с OIDC-авторизацией на стороннем сервере.
Клиент **не имеет** формы логина/пароля (`src/ui/signupModal.ts` удалён на ветке `yandex`): единственный источник
идентичности — Yandex Games SDK, подпись игрока прокидывается на бэк.

Capacitor остаётся как API-слой (`@capacitor/app`, `toast`, `dialog`, `clipboard`, ...) и работает через
web-фоллбеки в браузере; нативных сборок в этом воркфлоу нет. `src/network/` — собственная web-реализация
`@capacitor/network`, `src/push.stub.ts` — заглушка вместо push.

## Команды

```bash
npm install
npm run build                 # inject-conf -> tsc -> stylus -> rollup -> www/
npm run watch                 # инкрементальная пересборка
npm run serve                 # http-server на :8080, открывать http://localhost:8080/www
npm start                     # watch + serve одновременно
npm run clean                 # чистит build/ и артефакты в www/
npx tsc --noEmit              # быстрая проверка типов (проходит чисто)
```

Сборка параметризуется переменными окружения (см. `scripts/inject-conf.js`):

```bash
APP_CONFIG=yandex APP_MODE=release npm run build
```

* `APP_CONFIG` (по умолчанию `dev`) выбирает `appconfig.<key>.json` → подставляется в `src/index.mustache`
  → генерирует `www/index.html`. В git лежит только `appconfig.dev.json`, остальные (`prod`, `draft`, `yandex`)
  в `.gitignore` — локальные.
* `APP_MODE` = `dev` | `release`; `release` включает strip + terser в `rollup.config.js`.

### Скрипты, которые сейчас не работают

* `npm run lint` — падает: ESLint 9 требует flat config (`eslint.config.js`), а в репозитории только
  `.eslintrc.json` и `.eslintignore`. Правила из `.eslintrc.json`: одинарные кавычки, `eqeqeq: smart`, `semi` off.
* `npm run test` — падает: `jest-environment-jsdom` не установлен (Jest 28+ его не тянет).
  Тестов немного: `src/**/__tests__/*` (fen, object, util, http, ForecastCtrl, backoff).

Не считай эти команды «проверкой» — используй `npx tsc --noEmit`. Починка этих скриптов — отдельная осознанная задача.

### Windows

npm-скрипты написаны в POSIX-синтаксисе (`concurrently 'npm:watch'`, `NODE_OPTIONS=... jest`) — запускай их
через Git Bash, а не через PowerShell/cmd.

## Архитектура

### Конвейер сборки

`src/*.ts(x)` → `tsc --outDir build/` → `rollup` (два бандла: `build/main.js` → `www/main.js` с code-splitting
и `build/socketWorker/index.js` → `www/socketWorker.js` как IIFE). Stylus `src/styl/index.styl` →
`www/css/compiled/app.css`. Содержимое `www/*.js`, `www/index.html`, `www/css/compiled` — артефакты, в `.gitignore`.

Алиас `~/*` → `src/*` (tsconfig `paths` + `@rollup/plugin-alias`, в jest — через `moduleNameMapper`).

### Рантайм

* **Mithril только как hyperscript** (`h`). Никакого `m.route`, `m.request`, `m.redraw`. Перерисовка — свой
  механизм `src/utils/redraw` + `signals.redraw` (дебаунс внутри animation frame). JSX-вью существуют по
  историческим причинам; новые писать на `h`.
* **Роутер** — `rlite` поверх querystring: путь живёт в `?=/game/xxxx` (`router.run(qs.slice(2))` в
  `src/router.ts`). Это важно для Yandex.Games, где приложение отдаётся из iframe.
* **WebSocket** живёт в Web Worker (`src/socketWorker/`), приложение общается с ним сообщениями через
  `src/socket/index.ts` (`tellWorker`/`askWorker`). `StrongSocket` сам делает ping/pong, ack, reconnect
  и версионирование сообщений.
* **Конфиг** — `window.lichess`, инжектится в `www/index.html` из mustache-шаблона, читается `src/config.ts`.
  `apiVersion: 5` → заголовок `Accept: application/vnd.lichess.v5+json`.
* **CSP задан в `src/index.mustache`**: `connect-src` содержит `{{{apiEndPoint}}}`/`{{{socketEndPoint}}}`,
  `script-src` разрешает `https://*.yandex.net`. При смене хоста бэкенда правь шаблон, иначе всё молча отвалится.
* **Stockfish** копируется из `stockfish/` в `www/` на шаге `postbuild`.

## Авторизация и сессии (главное отличие форка)

### Цепочка инициализации

`src/main.ts` жёстко завязана на Yandex SDK, и порядок в ней значим:

```
YaGames.init() -> setSdk(ysdk) -> initNetwork -> settingsInit -> appInit -> routes/deepLinks
                -> theme -> i18n -> processWindowLocation -> session.autologin()
```

`src/sdk.ts` — тривиальный синглтон (`setSdk`/`getSdk`) **без проверки на инициализацию**. Любой вызов
`getSdk()` до `YaGames.init()` вернёт `undefined` и упадёт. Скрипт SDK подключается синхронно в `<head>`
по `{{{sdkUrl}}}`: `dev`/`yandex` тянут `https://sdk.games.s3.yandex.net/sdk.js`, `prod`/`draft` ожидают
самохостящийся `/sdk.js` рядом с `index.html` (в репозитории его нет — файл кладётся при деплое,
`www/*.js` в `.gitignore`).

`src/storage.ts` — тоже поверх SDK (`ysdk.getStorage()`, `SafeStorage` ≈ localStorage). Поэтому **всё
хранилище асинхронное** (`settings`, `session`, `sessionId`) и недоступно до инициализации SDK. Старый
`asyncStorage.ts` из lichobile удалён, остался один `storage`.

### Вход

`src/session.ts`:

* `initPlayer()` — кэширует `ysdk.getPlayer()` (обычный `Player`, есть `isAuthorized()`).
* `loginInternal()` — берёт `ysdk.getPlayer({ signed: true })`, что возвращает **только** `{ signature }`
  (см. `@types/ysdk`), и делает `POST /auth/signature` с телом
  `{"provider": "yandex-game", "signature": "<base64 hmac>.<base64 профиля>"}`.
  Подпись намеренно **не передаётся в query-строке**: у неё долгий TTL, привязать к ней nonce нельзя
  (`getPlayer` не принимает `requestPayload`, в отличие от `payments.purchase` с его `developerPayload`),
  то есть это фактически бессрочный предъявительский credential, и в URL он оседал бы в access-логах и `Referer`.
  Отдельный маршрут нужен потому, что `POST /login` в lila уже занят формой логин/пароль
  (`controllers.Auth.authenticate`).
* `autologin()` — вызывается в конце `main.ts`; логинится **только если** `player.isAuthorized()`.
  Анонимный игрок Yandex остаётся анонимом, приложение работает без сессии.
* `login()` (интерактивный, `throttle` 1 с) — если игрок не авторизован, открывает `ysdk.auth.openAuthDialog()`,
  переинициализирует игрока (`initPlayer(true)`) и вызывает `loginInternal()`. Возвращает `boolean`,
  а не бросает исключение при отказе от диалога.
* UI-обёртка — `src/ui/login.ts` (`loginManager.login`), дёргается из `menuView.tsx`, `challengeView.tsx`,
  `ui/training/menu.ts`. После успеха: `signals.afterLogin`, `socket.reconnectCurrent()`,
  `challengesApi.refresh()`, `session.refresh()`.

### Как сессия ездит на бэк

Два разных канала для одного и того же `sessionId` — менять нужно синхронно:

1. **HTTP** (`src/http.ts`): на каждый запрос читается `sessionId` из storage и добавляется как
   **нестандартный заголовок с именем `sessionId`** (`SESSION_ID_KEY`), плюс всегда `credentials: 'include'`
   (то есть куки бэкенда тоже работают). CORS на бэкенде должен разрешать этот заголовок.
   Заголовок можно точечно снять, передав значение-сентинел `'__delete'` в `opts.headers` — так делают
   запросы к внешним сервисам lichess (`ui/analyse/explorer/explorerXhr.ts`, `ui/shared/round/roundXhr.ts`).
2. **WebSocket** (`src/socket/index.ts`, `setupConnection`): тот же `sessionId` кладётся в **query-параметры**
   URL сокета и выставляет `opts.options.isAuth`. Заголовки в WS недоступны, поэтому канал другой.
   `reconnectCurrent()` пересоздаёт соединение, чтобы подхватить свежий `sessionId`; он подписан на
   `signals.afterLogout`.

`sessionId` приходит **только** в ответе на `/login` (поле `Session.sessionId`, помечено «sent on login/signup only»)
и складывается в storage; сам объект сессии дублируется в storage под ключом `session` для оффлайна
(`restoreStoredSession()`).

### Обновление и выход

* `refresh()` / `backgroundRefresh()` / `rememberLogin()` — все три идут в `GET /account/info`.
  `refresh()` на `401` считает сессию потерянной: чистит storage, шлёт `signals.afterLogout`, показывает тост.
* `logout()` — `POST /logout`, затем `onLogout()` (удаляет `session` и `sessionId` из storage) и
  `signals.afterLogout` → реконнект сокета.
* `app.ts` перезапрашивает `session.refresh()` при возврате приложения в foreground (`appStateChange`).

### Контракт `POST /auth/signature` (на бэкенде ещё не реализован)

В чекауте бэкенда `line` (ветка `chess-online2`) обработчика нет: `GET /login` там — это `oidcLogin`,
который редиректит на OIDC-провайдера и игнорирует любые параметры подписи. Клиент уже шлёт новый формат,
серверную часть нужно написать. Что она обязана делать:

1. Разобрать `signature` как `<base64 hmac>.<base64 JSON>` (split по первой точке).
2. Посчитать `HMAC-SHA256` от **строки JSON до парсинга** секретом приложения Yandex Games
   и сравнить с первой частью в base64. Сравнивать константным по времени сравнением.
3. Проверить `issuedAt` из payload на свежесть. Это единственная доступная защита от replay:
   nonce привязать нельзя, а сама подпись не истекает.
4. Сопоставить профиль из payload со своей OIDC-идентичностью и вернуть JSON `Session`
   с полем `sessionId` (клиент читает его в `loginInternal` и кладёт в storage).

Ответ, не проходящий `isSession()` (нет поля `id`), трактуется клиентом как ipban.

### Известные шероховатости (учитывать при правках)

* **Гонка на холодном старте.** `appInit()` (вызывается в середине цепочки `main.ts`) регистрирует
  `Network.getStatus().then(onOnline)`, а `onOnline()` дёргает `session.rememberLogin()` → `/account/info`
  по *старому* сохранённому `sessionId`/куке. Это происходит раньше, чем `session.autologin()` в конце цепочки
  сделает `/auth/signature` по подписи. То есть при запуске конкурируют два пути установления сессии.
* `handleXhrError` в `src/utils/index.ts` содержит захардкоженные строки («Chess-Online Arena is unreachable»)
  вне i18n.
* `Session` всё ещё несёт legacy-поля lichess: `confirmEmail()`, `SignupData`/`EmailConfirm`, `setKidMode()` —
  логина по паролю нет, но типы и вызовы остались.
* `appconfig.yandex.json` указывает на настоящие `lichess.org`/`socket.lichess.org`, а не на бэкенд проекта —
  проверяй, какой конфиг собираешь.
* У `getPlayer` лимит **20 вызовов за 5 минут**. `loginInternal()` запрашивает подпись при каждом входе,
  а гонка на старте плюс реконнекты сокета могут этот лимит подъедать.

## Соглашения

Из `CONTRIBUTING.md` и `.kilocode/rules/arena-yandex.md`:

* Только TypeScript, `strict`, `noUnusedLocals`/`noUnusedParameters` включены.
* Вью — hyperscript `h`, не JSX.
* Перерисовка — `~/utils/redraw`.
* Комментарии писать по-русски; эталонная локаль — `ru` (`translation/`, `www/i18n/`).
* Стили — Stylus, всё подключается через `src/styl/index.styl`.
* Форматирование в `src/session.ts`, `src/http.ts`, `src/storage.ts` отличается от остального кода
  (4 пробела, точки с запятой, двойные кавычки) — это следы рефакторинга ветки `yandex`, а не общий стиль.
