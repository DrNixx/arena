import h from 'mithril/hyperscript'
import { Api as CgApi } from 'chessground/api';
import settings from '../../settings'
import redraw from '../../utils/redraw'
import BoardBrush, { Shape } from './BoardBrush'
import { Chessground } from 'chessground';
import { BoardInterface } from './round';

export interface Attrs {
  variant: VariantKey
  ctrl: BoardInterface
  wrapperClasses?: string
  customPieceTheme?: string
  shapes?: ReadonlyArray<Shape>
  clearableShapes?: ReadonlyArray<Shape>
  canClearShapes?: boolean
}

interface State {
  ground: CgApi
  wrapperOnCreate(vnode: Mithril.VnodeDOM<any, any>): void
  boardOnCreate(vnode: Mithril.VnodeDOM<any, any>): void
  boardOnRemove(): void
  boardTheme: string
  pieceTheme: string
  blindfoldChess: boolean
  shapesCleared: boolean
  bounds?: ClientRect
  onResize: () => void
}

export default {
  oninit(vnode) {

    const { ctrl, canClearShapes } = vnode.attrs

    this.wrapperOnCreate = ({ dom }) => {
      if (canClearShapes) {
        const clear = () => {
          if (!this.shapesCleared) {
            this.shapesCleared = true
            redraw()
          }
        }

        if (!('ontouchstart' in window)) {
          dom.addEventListener('mousedown', clear)
        } else {
          dom.addEventListener('touchstart', clear)  
        }
      }
      this.bounds = dom.getBoundingClientRect()
      this.onResize = () => {
        this.bounds = dom.getBoundingClientRect()
      }
      window.addEventListener('resize', this.onResize)
    }

    this.boardOnCreate = ({ dom }: Mithril.VnodeDOM<any, any>) => {
      this.ground = Chessground(dom as HTMLElement, ctrl.getGroundConfig())
      ctrl.setChessground(this.ground)
    }

    this.boardOnRemove = () => {
      if (this.ground) this.ground.stop()
    }

    this.shapesCleared = false
    this.pieceTheme = settings.general.theme.piece()
    this.boardTheme = settings.general.theme.board()
    this.blindfoldChess = settings.game.blindfoldChess()
  },

  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    // TODO: does not take into account same shapes put on 2 different nodes
    // maybe add fen attr to fix that
    if (attrs.clearableShapes !== oldattrs.clearableShapes) {
      this.shapesCleared = false
    }
    return true
  },

  view(vnode) {
    const { variant, wrapperClasses, customPieceTheme, shapes, clearableShapes } = vnode.attrs

    const boardClass = [
      'cg-wrap',
      'orientation-' + (this.ground?.state.orientation ?? 'white'),
      `board-${this.boardTheme}`,
      customPieceTheme || this.pieceTheme,
      `blindfold-${this.blindfoldChess}`,
      variant
    ].join(' ')

    let wrapperClass = 'playable_board_wrapper'

    if (wrapperClasses) {
      wrapperClass += ' '
      wrapperClass += wrapperClasses
    }

    const allShapes = [
      ...(shapes !== undefined ? shapes : []),
      ...(clearableShapes !== undefined && !this.shapesCleared ? clearableShapes : [])
    ]

    return h('section', {
      className: wrapperClass,
      oncreate: this.wrapperOnCreate,
      onremove: () => {
        window.removeEventListener('resize', this.onResize)
      }
    }, [
      vnode.children,
      h('div', {
        className: boardClass,
        oncreate: this.boardOnCreate,
        onremove: this.boardOnRemove,
      }),
      allShapes.length > 0 && this.bounds ?
        BoardBrush(
          this.bounds,
          this.ground.state.orientation,
          allShapes,
          this.pieceTheme
        ) : null
    ])
  }
} as Mithril.Component<Attrs, State>
