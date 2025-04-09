import { Api as CgApi } from 'chessground/api';
import * as cg from 'chessground/types'
import { key2pos, pos2key } from 'chessground/util'

function capture(chessgroundCtrl: CgApi, key: Key) {
  const exploding: Key[] = []
  const diff: cg.PiecesDiff = new Map()
  const orig = key2pos(key)
  for (let x = -1; x < 2; x++) {
    for (let y = -1; y < 2; y++) {
      const k = pos2key([orig[0] + x, orig[1] + y] as cg.Pos)
      if (k) {
        exploding.push(k)
        const p = chessgroundCtrl.state.pieces.get(k)
        const explodes = p && (
          k === key || p.role !== 'pawn')
        if (explodes) diff.set(k, undefined)
      }
    }
  }
  chessgroundCtrl.setPieces(diff)
  chessgroundCtrl.explode(exploding)
}

// needs to explicitly destroy the capturing pawn
function enpassant(chessgroundCtrl: CgApi, key: Key, color: Color) {
  const pos = key2pos(key)
  const pawnPos = [pos[0], pos[1] + (color === 'white' ? -1 : 1)] as cg.Pos
  capture(chessgroundCtrl, pos2key(pawnPos))
}

export default {
  capture,
  enpassant
}
