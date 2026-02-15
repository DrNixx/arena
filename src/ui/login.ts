import session from '../session'
import { ErrorResponse } from '../http'
import redraw from '../utils/redraw'
import socket from '../socket'
import signals from '../signals'
import challengesApi from '../lichess/challenges'
import { handleXhrError } from '../utils'

let loading = false

export default {
  login,
}

function login(e: Event) {
  if (loading) return false
  e.preventDefault()
  loading = true
  session.login()
    .then((success) => {
        loading = false
        if (success) {
            signals.afterLogin.dispatch()
            redraw()
            // reconnect socket to refresh friends...
            socket.reconnectCurrent()
            challengesApi.refresh()
            session.refresh()
        }
    })
    .catch((err: ErrorResponse) => {
        loading = false
        if (!err.body.ipban) {
            if (err.status !== 400 && err.status !== 401) handleXhrError(err)
            else {
                if (err.body.global) {
                    redraw()
                }
            }
        }
    })
}
