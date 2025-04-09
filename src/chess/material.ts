import { State } from "chessground/state"

const pieceScores: { [id: string]: number } = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0
}

// {white: {pieces: {pawn: 3 queen: 1}, score: 6}, black: {pieces: {bishop: 2}, score: -6}
export interface MaterialDiff {
    white: { pieces: { [k: string]: number }, score: number }
    black: { pieces: { [k: string]: number }, score: number }
}

export function getMaterialDiff(s: State): MaterialDiff {
    let score = 0
    const counts: { [role: string]: number } = {
      king: 0,
      queen: 0,
      rook: 0,
      bishop: 0,
      knight: 0,
      pawn: 0
    }
    for (const p of s.pieces.values()) {
      counts[p.role] += (p.color === 'white') ? 1 : -1
      score += pieceScores[p.role] * (p.color === 'white' ? 1 : -1)
    }
    const diff: MaterialDiff = {
      white: { pieces: {}, score: score },
      black: { pieces: {}, score: -score }
    }
    for (const role in counts) {
      const c = counts[role]
      if (c > 0) diff.white.pieces[role] = c
      else if (c < 0) diff.black.pieces[role] = -c
    }
    return diff
  }