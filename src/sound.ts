import throttle from 'lodash-es/throttle'
import settings from './settings'
import { isForeground } from './utils/appMode'

let ctx = typeof(window.AudioContext) !== 'undefined' ? new AudioContext() : null

export default {
  load(): Promise<void> {
    return Promise.all([
      loadSound('move'),
      loadSound('capture'),
      loadSound('explosion'),
      loadSound('lowtime'),
      loadSound('dong'),
      loadSound('berserk'),
      loadSound('clock'),
      loadSound('confirmation'),
    ]).then(() => console.log('all sounds loaded.'))
  },

  resume(): void {
    if (ctx != null) {
      void ctx.close() // should be able to reuse these. However, webkit.
      ctx = new AudioContext()
    }
  },
  move(): void {
    play('move')
  },
  throttledMove: throttle(() => {
    play('move')
  }, 50),
  capture(): void {
    play('capture')
  },
  throttledCapture: throttle(() => {
    play('capture')
  }, 50),
  explosion(): void {
    play('explosion')
  },
  throttledExplosion: throttle(() => {
    play('explosion')
  }, 50),
  lowtime(): void {
    play('lowtime')
  },
  dong(): void {
    play('dong')
  },
  berserk(): void {
    play('berserk')
  },
  clock(): void {
    play('clock')
  },
  confirmation(): void {
    play('confirmation')
  },
}

const audioMap: { [id: string]: HTMLAudioElement | undefined } = {}

function loadSound(id: string): void {
  const path = `sounds/${id}.mp3`
  const audio = new Audio()
  audio.setAttribute('src', path)
  audio.load()
  audioMap[id] = audio
}

function play(id: string): void {
  if (settings.general.sound() && isForeground()) {
    const audio = audioMap[id]
    if (audio) audio.play()
  }
}
