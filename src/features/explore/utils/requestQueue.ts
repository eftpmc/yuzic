/** MusicBrainz requires at least 1 second between requests */
export const MUSICBRAINZ_DELAY_MS = 1000

/** ListenBrainz is more permissive; keep separate from MusicBrainz */
export const LISTENBRAINZ_DELAY_MS = 500

export class RequestQueue {
  private lastStart = 0
  constructor(private delayMs: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const wait = Math.max(0, this.delayMs - (now - this.lastStart))
    if (wait) {
      await new Promise(r => setTimeout(r, wait))
    }
    this.lastStart = Date.now()
    return fn()
  }
}

/** FIFO: one MusicBrainz request at a time, enforcing 1s between request STARTS. */
type QueuedTask<T> = {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (err: unknown) => void
}

class FifoMusicBrainzQueue {
  private lastStart = 0
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

    // Enforce 1s between request STARTS (not completions).
    // If a request takes 200ms, the next starts at exactly 1000ms from last start
    // rather than 1000ms after the previous finished (1200ms total).
    const now = Date.now()
    const wait = Math.max(0, this.delayMs - (now - this.lastStart))
    if (wait) await new Promise(r => setTimeout(r, wait))

    this.lastStart = Date.now()
    try {
      const result = await fn()
      resolve(result)
    } catch (err) {
      reject(err)
    } finally {
      this.processing = false
      if (this.queue.length) this.drain()
    }
  }
}

export const sharedMusicBrainzQueue = new FifoMusicBrainzQueue(MUSICBRAINZ_DELAY_MS)
