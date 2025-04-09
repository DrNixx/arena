const uciRoleMap: {[k: string]: Role } = {
  P: 'pawn',
  B: 'bishop',
  N: 'knight',
  R: 'rook',
  Q: 'queen',
  p: 'pawn',
  b: 'bishop',
  n: 'knight',
  r: 'rook',
  q: 'queen',
}

export interface SanToRole {
  [san: string]: Role
}

export const sanToRole: SanToRole = {
  P: 'pawn',
  N: 'knight',
  B: 'bishop',
  R: 'rook',
  Q: 'queen'
}

export const altCastles: StringMap = {
  e1a1: 'e1c1',
  e1h1: 'e1g1',
  e8a8: 'e8c8',
  e8h8: 'e8g8'
}

export function uciToMove(uci: string): Key[] {
  return [<Key>uci.substring(0, 2), <Key>uci.substring(2, 4)]
}

export function uciToMoveOrDrop(uci: string): KeyPair {
  if (uci[1] === '@') return [<Key>uci.substring(2, 4), <Key>uci.substring(2, 2)]
  return [<Key>uci.substring(0, 2), <Key>uci.substring(2, 4)]
}

export function uciToProm(uci: string): Role | undefined {
  const p = uci.substring(4, 5)
  return uciRoleMap[p]
}

export function uciToDropPos(uci: string): Key {
  return <Key>uci.substring(2, 4)
}

export function uciToDropRole(uci: string): Role {
  return uciRoleMap[uci.substring(0, 1)]
}

export function uciTolastDrop(uci: string): KeyPair {
  return [<Key>uci.substring(2, 4), <Key>uci.substring(2, 4)]
}

export function fixCrazySan(san: San): San {
  return san[0] === 'P' ? san.slice(1) : san
}

export function decomposeUci(uci: Uci): [Key, Key, SanChar] {
  return [<Key>uci.slice(0, 2), <Key>uci.slice(2, 4), <SanChar>uci.slice(4, 5)]
}

export const piotr2key: {[i: string]: Key } = {
  'a': 'a1',
  'b': 'b1',
  'c': 'c1',
  'd': 'd1',
  'e': 'e1',
  'f': 'f1',
  'g': 'g1',
  'h': 'h1',
  'i': 'a2',
  'j': 'b2',
  'k': 'c2',
  'l': 'd2',
  'm': 'e2',
  'n': 'f2',
  'o': 'g2',
  'p': 'h2',
  'q': 'a3',
  'r': 'b3',
  's': 'c3',
  't': 'd3',
  'u': 'e3',
  'v': 'f3',
  'w': 'g3',
  'x': 'h3',
  'y': 'a4',
  'z': 'b4',
  'A': 'c4',
  'B': 'd4',
  'C': 'e4',
  'D': 'f4',
  'E': 'g4',
  'F': 'h4',
  'G': 'a5',
  'H': 'b5',
  'I': 'c5',
  'J': 'd5',
  'K': 'e5',
  'L': 'f5',
  'M': 'g5',
  'N': 'h5',
  'O': 'a6',
  'P': 'b6',
  'Q': 'c6',
  'R': 'd6',
  'S': 'e6',
  'T': 'f6',
  'U': 'g6',
  'V': 'h6',
  'W': 'a7',
  'X': 'b7',
  'Y': 'c7',
  'Z': 'd7',
  '0': 'e7',
  '1': 'f7',
  '2': 'g7',
  '3': 'h7',
  '4': 'a8',
  '5': 'b8',
  '6': 'c8',
  '7': 'd8',
  '8': 'e8',
  '9': 'f8',
  '!': 'g8',
  '?': 'h8'
}
