export class StockfishWeb {
  private worker?: Worker

  async getMaxMemory(): Promise<{ value: number }> {
    return Promise.resolve({ value: 1024 })
  }

  async start() {
    return new Promise((resolve) => {
      if (this.worker) {
        setTimeout(resolve, 1)
      } else {
        this.worker = new Worker('../stockfish.js')
        this.worker.onmessage = msg => {

          const ev: any = new Event('stockfish')
          ev['output'] = msg.data
          window.dispatchEvent(ev)
        }
        setTimeout(resolve, 1)
      }
    }).then(() => {})
  }

  async cmd({ cmd }: { cmd: string }) {
    return new Promise((resolve) => {
      if (this.worker) this.worker.postMessage(cmd)
      setTimeout(resolve, 1)
    }).then(() => {})
  }

  async exit() {
    return new Promise((resolve) => {
      if (this.worker) {
        this.worker.terminate()
        this.worker = undefined
      }
      setTimeout(resolve, 1)
    }).then(() => {})
  }
}
