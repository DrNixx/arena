import * as helper from '../helper'
import socket from '../../socket'
import EditorCtrl from './EditorCtrl'
import editorView from './editorView'

interface Attrs {
  fen?: string
}

interface State {
  editor: EditorCtrl
}

const EditorScreen: Mithril.Component<Attrs, State> = {
  oninit({ attrs }) {
    socket.createDefault()
    this.editor = new EditorCtrl(attrs.fen)
  },
  oncreate: helper.viewFadeIn,
  onremove() {
  },
  view() {
    return editorView(this.editor)
  }
}

export default EditorScreen
