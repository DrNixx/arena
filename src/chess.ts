import * as cg from 'chessground/types';
import { askWorker } from './utils/worker'
import { GameStatus, CheckCount, Pockets } from './lichess/interfaces/game'
import { VariantKey, Variant } from './lichess/interfaces/variant'

const worker = new Worker('vendor/scalachess.js')

// warmup
worker.postMessage({ topic: 'init', payload: { variant: 'standard'}})

export const fixCrazySan = (san: San): San => (san[0] === 'P' ? san.slice(1) : san);

export const destsToUcis = (destMap: cg.Dests): Uci[] =>
  Array.from(destMap).reduce<Uci[]>((acc, [orig, dests]) => acc.concat(dests.map(dest => orig + dest)), []);

export const readDestsFromString = (lines?: string): cg.Dests | undefined =>
  lines
    ? lines.split(' ').reduce<cg.Dests>((dests, line) => {
      dests.set(line.slice(0, 2) as Key, line.slice(2).match(/.{2}/g) as Key[]);
        return dests;
      }, new Map())
    : undefined;

export function readDests(lines?: DestsMap | string): cg.Dests | undefined {
  if (lines === undefined) {
    return lines;
  }

  if (typeof lines === 'string') {
      return readDestsFromString(lines);
  } else {
      const dests: cg.Dests = new Map<Key, Key[]>();
      for (const k in lines) {
        const line = lines[k];
        if (line) {
          dests.set(k as Key, line as Key[]);
        }
      }

      return dests;
  }
}

export const readDrops = (line?: string | null): Key[] | null =>
  line ? (line.match(/.{2}/g) as Key[]) || [] : null;

// Extended Position Description
export const fenToEpd = (fen: cg.FEN): string => fen.split(' ').slice(0, 4).join(' ');

export const plyToTurn = (ply: number): number => Math.floor((ply - 1) / 2) + 1;

export const pieceCount = (fen: cg.FEN): number => fen.split(/\s/)[0].split(/[nbrqkp]/i).length - 1;

export interface GameSituation {
  readonly id: string
  readonly ply: number
  readonly variant: string
  readonly fen: string
  readonly player: Color
  readonly dests: DestsMap
  readonly drops?: ReadonlyArray<string>
  readonly end: boolean
  readonly playable: boolean
  readonly status?: GameStatus
  readonly winner?: Color
  readonly check: boolean
  readonly checkCount?: CheckCount
  readonly san?: San
  readonly uci?: Uci
  readonly pgnMoves: ReadonlyArray<string>
  readonly uciMoves: ReadonlyArray<string>
  readonly promotion?: string
  readonly crazyhouse?: {
    readonly pockets: Pockets
  }
}

export interface InitRequest {
  readonly variant: VariantKey
  readonly fen?: string
}

export interface InitResponse {
  readonly variant: Variant
  readonly setup: GameSituation
}

export interface SituationRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly path?: string
}

export interface SituationResponse {
  readonly situation: GameSituation
  readonly path: string
}

export interface MoveRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly orig: Key
  readonly dest: Key
  readonly pgnMoves?: ReadonlyArray<string>
  readonly uciMoves?: ReadonlyArray<string>
  promotion?: Role
  readonly path?: string
}

export interface MoveResponse {
  readonly situation: GameSituation
  readonly path?: string
}

export interface DropRequest {
  readonly variant: VariantKey
  readonly fen: string
  readonly pos: Key
  readonly role: Role
  readonly pgnMoves?: ReadonlyArray<string>
  readonly uciMoves?: ReadonlyArray<string>
  readonly path?: string
}

export interface ThreefoldTestRequest {
  readonly variant: VariantKey
  readonly initialFen: string
  readonly pgnMoves: ReadonlyArray<string>
}

export interface ThreefoldTestResponse {
  readonly threefoldRepetition: boolean
  readonly status: GameStatus
}

export interface PgnDumpRequest {
  readonly variant: VariantKey
  readonly initialFen: string
  readonly pgnMoves: ReadonlyArray<string>
  readonly white?: string
  readonly black?: string
  readonly date?: string
}

export interface PgnDumpResponse {
  readonly pgn: string
}

function uniqId() {
  return String(performance.now())
}

export function init(payload: InitRequest): Promise<InitResponse> {
  return askWorker(worker, { topic: 'init', payload })
}

export function situation(payload: SituationRequest): Promise<SituationResponse> {
  return askWorker(worker, { topic: 'situation', payload, reqid: uniqId() })
}

export function move(payload: MoveRequest): Promise<MoveResponse> {
  return askWorker(worker, { topic: 'move', payload, reqid: uniqId() })
}

export function drop(payload: DropRequest): Promise<MoveResponse> {
  return askWorker(worker, { topic: 'drop', payload, reqid: uniqId() })
}

export function threefoldTest(payload: ThreefoldTestRequest): Promise<ThreefoldTestResponse> {
  return askWorker(worker, { topic: 'threefoldTest', payload })
}

export function pgnDump(payload: PgnDumpRequest): Promise<PgnDumpResponse> {
  return askWorker(worker, { topic: 'pgnDump', payload })
}
