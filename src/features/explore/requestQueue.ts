export class RequestQueue {
  private last = 0
  constructor(private delayMs: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const wait = Math.max(0, this.delayMs - (now - this.last))
    if (wait) {
      await new Promise(r => setTimeout(r, wait))
    }
    this.last = Date.now()
    return fn()
  }
}