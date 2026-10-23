export interface Config {
  mode: 'dev' | 'prod'
  providerName: 'yandex-game' | 'friday-game' | 'vk-game'
  apiEndPoint: string
  socketEndPoint: string
  apiVersion: number
  fetchTimeoutMs: Millis
  packageVersion: string
}

const defaults = {
  apiVersion: 5,
  fetchTimeoutMs: 15000
}

const config = Object.assign({}, defaults, window.lichess)

export default config as Config
