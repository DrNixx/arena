import * as cg from 'chessground/types';

export interface SetConfig {
    orientation?: Color
    fen?: string
    lastMove?: Key[] | undefined
    check?: Color | boolean
    turnColor?: Color
    movableColor?: Color | 'both' | undefined
    dests?: cg.Dests | undefined
}