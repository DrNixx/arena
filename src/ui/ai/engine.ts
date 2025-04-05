import { AiRoundInterface } from '../shared/round'
import { StockfishPlugin, IStockfishEvent, getNbCores } from '../../stockfish'

export default class Engine {
  private level = 1
  private stockfish: StockfishPlugin
  private isInit = false
  private listener: (e: Event) => void

  constructor(readonly ctrl: AiRoundInterface, readonly variant: VariantKey) {
    this.listener = (e: Event) => {
      const line = (e as IStockfishEvent).output
      console.debug('[stockfish >>] ' + line)
      const bmMatch = line.match(/^bestmove (\w{4,5})|^bestmove ([PNBRQ]@\w{2})/)
      if (bmMatch) {
        if (bmMatch[1]) this.ctrl.onEngineMove(bmMatch[1])
        else if (bmMatch[2]) this.ctrl.onEngineDrop(bmMatch[2])
      }
    }
    this.stockfish = new StockfishPlugin(variant)
  }

  public async init(): Promise<void> {
    try {
      if (!this.isInit) {
        await this.stockfish.start()
        this.isInit = true
        window.addEventListener('stockfish', this.listener, { passive: true })
        await this.stockfish.setVariant()
        await this.stockfish.setOption('Threads', getNbCores())
        await this.newGame()
      }
    } catch (e) {
      console.error(e)
    }
  }

  public async newGame(): Promise<void> {
    // from UCI protocol spec, the client should always send isready after
    // ucinewgame
    await this.stockfish.send('ucinewgame')
    await this.stockfish.isReady()
    await this.stockfish.setOption('UCI_AnalyseMode', false)
    await this.stockfish.setOption('UCI_LimitStrength', true)
  }

  public async search(initialFen: string, moves: string): Promise<void> {
    // console.info('engine search pos: ', `position fen ${initialFen} moves ${moves}`)
    await this.stockfish.send(`position fen ${initialFen} moves ${moves}`)
    await this.stockfish.send(`go movetime ${moveTime(this.level)} depth ${depth(this.level)}`)
  }

  public setLevel(l: number): void {
    this.level = l
  }

  public async exit(): Promise<void> {
    window.removeEventListener('stockfish', this.listener, false)
    return this.stockfish.exit()
  }
}

const maxMoveTime = 5000
const levelToDepth: Record<number, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 5,
  5: 5,
  6: 8,
  7: 13,
  8: 22
}

function moveTime(level: number) {
  return level * maxMoveTime / 8
}

function depth(level: number) {
  return levelToDepth[level]
}
