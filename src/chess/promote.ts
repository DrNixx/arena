import { Api as CgApi } from 'chessground/api';
import * as cg from 'chessground/types'

export function promote(api: CgApi, key: Key, role: Role): void {
    const diff: cg.PiecesDiff = new Map()
    const piece = api.state.pieces.get(key)
    if (piece && piece.role === 'pawn') {
      diff.set(key, {
        color: piece.color,
        role: role
      })

      api.setPieces(diff)
    }
}
