import { Api as CgApi } from 'chessground/api';
import { Config as CgConfig } from 'chessground/config'
import * as gameApi from '../../../lichess/game'
import settings from '../../../settings'
import { boardOrientation, animationDuration } from '../../../utils'
import { OfflineGameData } from '../../../lichess/interfaces/game'
import { AfterMoveMeta } from '../../../lichess/interfaces/move'
import { uciToMoveOrDrop } from '../../../utils/chessFormat'
import { GameSituation, readDests } from '../../../chess'

function makeConfig(
  data: OfflineGameData, sit: GameSituation,
  userMove: (orig: Key, dest: Key, meta: AfterMoveMeta) => void,
  userNewPiece: (role: Role, key: Key, meta: AfterMoveMeta) => void,
  onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
  onNewPiece: () => void
): CgConfig {
  const lastUci = sit.uciMoves.length ? sit.uciMoves[sit.uciMoves.length - 1] : null
  const pieceMoveConf = settings.game.pieceMove()
  const config: CgConfig = {
    fen: sit.fen,
    orientation: boardOrientation(data),
    turnColor: sit.player,
    lastMove: lastUci ? uciToMoveOrDrop(lastUci) : undefined,
    check: sit.check,
    //otb: data.game.id === 'offline_otb',
    coordinates: settings.game.coords(),
    //otbMode: settings.otb.flipPieces() ? 'flip' : 'facing',
    //symmetricCoordinates: data.game.id === 'offline_otb',
    autoCastle: true,
    highlight: {
      lastMove: settings.game.highlights(),
      check: settings.game.highlights()
    },
    movable: {
      free: false,
      color: gameApi.isPlayerPlaying(data) ? sit.player : undefined,
      showDests: settings.game.pieceDestinations(),
      dests: readDests(sit.dests),
      rookCastle: settings.game.rookCastle() === 1,
    },
    animation: {
      enabled: !!settings.game.animations(),
      duration: animationDuration(settings.game.animations()),
    },
    premovable: {
      enabled: false
    },
    draggable: {
      enabled: pieceMoveConf === 'drag' || pieceMoveConf === 'both',
      distance: 3,
      autoDistance: settings.game.magnified()
    },
    selectable: {
      enabled: pieceMoveConf === 'tap' || pieceMoveConf === 'both'
    },
  }

  config.movable!.events = {
    after: userMove,
    afterNewPiece: userNewPiece
  }
  config.events = {
    move: onMove,
    dropNewPiece: onNewPiece
  }

  return config;
}

function reload(_ground: CgApi, _data: OfflineGameData, _sit: GameSituation) {
  // ground.set(makeConfig(data, sit))
}

function changeOTBMode(_ground: CgApi, _flip: boolean) {
  // ground.setOtbMode(flip ? 'flip' : 'facing')
}

function end(ground: CgApi) {
  ground.stop()
}

export default {
  makeConfig,
  reload,
  end,
  changeOTBMode
}
