/**
 * Drains the persisted download-job queue.
 *
 * Split out of DownloadContext so the parts that are easy to get subtly wrong
 * — reentrancy, the rerun window, and not letting one bad job wedge the queue
 * — can be exercised without a filesystem or a React tree.
 */

export type QueueJob<TTrack> = {
  id: string;
  tracks: TTrack[];
  collectionId?: string;
  /** Failed runs so far; absent on a job that has never failed. */
  attempts?: number;
};

export type JobRunDeps<TTrack, TJob extends QueueJob<TTrack>> = {
  /** Read live each pass, so jobs enqueued mid-run are picked up. */
  getJobs: () => TJob[];
  downloadTrack: (track: TTrack, collectionId?: string) => Promise<unknown>;
  /** Every track landed; the job is done and should leave the queue. */
  onJobComplete: (job: TJob) => void;
  /** A track failed and the job has attempts left; keep it for the next run. */
  onJobRescheduled: (job: TJob, attempts: number) => void;
  /** A track failed and the job is out of attempts; drop it. */
  onJobDropped: (job: TJob, attempts: number) => void;
  /** Setup before a pass — directory creation, staging cleanup. */
  prepare?: () => Promise<void>;
  concurrency: number;
  maxAttempts: number;
};

export type DownloadJobRunner<TTrack, TJob extends QueueJob<TTrack>> = {
  run: (deps: JobRunDeps<TTrack, TJob>) => Promise<void>;
  /** True while a pass is draining. Callers use it to avoid tidying up files a
   * running pass is still writing. */
  isRunning: () => boolean;
};

export function createDownloadJobRunner<
  TTrack,
  TJob extends QueueJob<TTrack>,
>(): DownloadJobRunner<TTrack, TJob> {
  let inFlight: Promise<void> | null = null;
  let rerunRequested = false;

  async function drain(deps: JobRunDeps<TTrack, TJob>): Promise<void> {
    await deps.prepare?.();

    // A job that keeps failing (dead link, deleted track, server outage) must
    // not wedge every other queued download behind it — skip it for the rest
    // of this run rather than stopping the queue. It stays persisted with an
    // attempt count and is retried on the next run.
    const failedJobIds = new Set<string>();

    for (;;) {
      const job = deps.getJobs().find(candidate => !failedJobIds.has(candidate.id));
      if (!job) break;

      let failed = false;
      for (let i = 0; i < job.tracks.length; i += deps.concurrency) {
        const chunk = job.tracks.slice(i, i + deps.concurrency);
        const results = await Promise.allSettled(
          chunk.map(track => deps.downloadTrack(track, job.collectionId))
        );
        if (results.some(result => result.status === 'rejected')) {
          failed = true;
          break;
        }
      }

      if (!failed) {
        deps.onJobComplete(job);
        continue;
      }

      failedJobIds.add(job.id);
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts >= deps.maxAttempts) {
        deps.onJobDropped(job, attempts);
      } else {
        deps.onJobRescheduled(job, attempts);
      }
    }
  }

  async function run(deps: JobRunDeps<TTrack, TJob>): Promise<void> {
    // A reentrant call must await the *same* in-flight run rather than no-op,
    // or the caller's promise resolves before the job it just enqueued has
    // been processed. The rerun flag closes the window where a job is enqueued
    // after the running loop broke out but before the run promise settled —
    // without it that job sat unprocessed until the next app foreground.
    if (inFlight) {
      rerunRequested = true;
      await inFlight;
      return;
    }

    do {
      rerunRequested = false;

      const pass = drain(deps);
      inFlight = pass;
      try {
        await pass;
      } finally {
        inFlight = null;
      }
    } while (rerunRequested && deps.getJobs().length > 0);
  }

  return { run, isRunning: () => inFlight !== null };
}
