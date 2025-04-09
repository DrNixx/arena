import h from 'mithril/hyperscript'
import { batchRequestAnimationFrame } from '../../utils/batchRAF'
import { Api as CgApi } from 'chessground/api';
import { uciToMove } from '../../utils/chessFormat'
import settings from '../../settings'
import { Chessground } from 'chessground';

export interface Attrs {
  readonly fen: string
  readonly orientation: Color
  readonly lastMove?: string
  readonly customPieceTheme?: string
  readonly variant?: VariantKey
  readonly fixed?: boolean
  readonly delay?: Millis
}

interface Config {
  batchRAF: (c: () => void) => void
  fen: string
  orientation: Color
  viewOnly: boolean
  minimalDom: boolean
  coordinates: boolean
  fixed: boolean
  lastMove: Key[] | undefined
}

interface State {
  ground: CgApi
  pieceTheme: string
  boardTheme: string
}

const ViewOnlyBoard: Mithril.Component<Attrs, State> = {
  oninit() {
    this.pieceTheme = settings.general.theme.piece()
    this.boardTheme = settings.general.theme.board()
  },

  oncreate({ attrs, dom }) {
    if (attrs.delay !== undefined) {
      setTimeout(() => {
        this.ground = Chessground(dom as HTMLElement, makeConfig(attrs))
      }, attrs.delay)
    } else {
      this.ground = Chessground(dom as HTMLElement, makeConfig(attrs))
    }
  },

  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    if (
      attrs.fen !== oldattrs.fen ||
      attrs.lastMove !== oldattrs.lastMove ||
      attrs.orientation !== oldattrs.orientation
    ) {
      return true
    }
    else return false
  },

  onupdate({ attrs }) {
    this.ground.set({
      ...attrs,
      lastMove: attrs.lastMove ? uciToMove(attrs.lastMove) : undefined
    })
  },

  onremove() {
    this.ground.stop()
  },

  view({ attrs }) {

    const boardClass = [
      'cg-wrap',
      attrs.customPieceTheme || this.pieceTheme,
      `board-${this.boardTheme}`,
      attrs.variant || 'standard'
    ].join(' ')

    return h('div', { className: boardClass })
  }
}

export default ViewOnlyBoard

function makeConfig({ fen, lastMove, orientation, fixed = true }: Attrs) {
  const conf: Config = {
    batchRAF: batchRequestAnimationFrame,
    viewOnly: true,
    fixed,
    minimalDom: true,
    coordinates: false,
    fen,
    lastMove: lastMove ? uciToMove(lastMove) : undefined,
    orientation: orientation || 'white'
  }

  return conf
}
