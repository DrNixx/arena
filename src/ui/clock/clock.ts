import { registerPlugin } from '@capacitor/core'
import * as helper from '../helper'
import layout from '../layout'

import ChessClockCtrl, { IChessClockCtrl } from './ChessClockCtrl'
import { clockBody, renderClockSettingsOverlay } from './clockView'

interface State {
  ctrl: IChessClockCtrl
}

interface FullScreenPlugin {
  hideSystemUI(): Promise<void>
  showSystemUI(): Promise<void>
}
const FullScreenPlugin = registerPlugin<FullScreenPlugin>('FullScreen')

const ChessClockScreen: Mithril.Component<Record<string, never>, State> = {
  oncreate: helper.viewFadeIn,

  oninit() {
    this.ctrl = ChessClockCtrl()
  },

  onremove() {
    const c = this.ctrl.clockObj()
    if (c !== undefined) {
      c.clear()
    }
  },

  view() {
    const body = () => clockBody(this.ctrl)
    const clockSettingsOverlay = () => renderClockSettingsOverlay(this.ctrl)

    return layout.clock(body, clockSettingsOverlay)
  }
}

export default ChessClockScreen
