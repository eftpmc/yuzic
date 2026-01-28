/** MusicBrainz requires at least 1 second between requests */
export const MUSICBRAINZ_DELAY_MS = 1000

/** ListenBrainz is more permissive; keep separate from MusicBrainz */
export const LISTENBRAINZ_DELAY_MS = 500

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

/** Shared MusicBrainz queue so similar-artists calls stay within 1 req/s */
type QueuedTask<T> = {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (err: unknown) => void
}

/** FIFO: one MusicBrainz request at a time, 1s after last *completion*. */
class FifoMusicBrainzQueue {
  private lastComplete = 0
  private queue: QueuedTask<unknown>[] = []
  private processing = false

  constructor(private delayMs: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueuedTask<unknown>)
      this.drain()
    })
  }

  private async drain(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true
    const { fn, resolve, reject } = this.queue.shift()!
    const now = Date.now()
    const wait = Math.max(0, this.delayMs - (now - this.lastComplete))
    if (wait) await new Promise(r => setTimeout(r, wait))
    try {
      const result = await fn()
      this.lastComplete = Date.now()
      resolve(result)
    } catch (err) {
      this.lastComplete = Date.now()
      reject(err)
    } finally {
      this.processing = false
      if (this.queue.length) this.drain()
    }
  }
}

export const sharedMusicBrainzQueue = new FifoMusicBrainzQueue(MUSICBRAINZ_DELAY_MS)