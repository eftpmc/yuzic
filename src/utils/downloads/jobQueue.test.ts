import { createDownloadJobRunner, type JobRunDeps, type QueueJob } from './jobQueue';

type Track = { id: string };
type Job = QueueJob<Track>;

function job(id: string, trackIds: string[], attempts?: number): Job {
  return { id, tracks: trackIds.map(trackId => ({ id: trackId })), attempts };
}

/**
 * Test harness mirroring how the provider drives the runner: jobs live in a
 * mutable list that onJobComplete/onJobDropped remove from and
 * onJobRescheduled updates in place.
 */
function harness(initialJobs: Job[], options: Partial<JobRunDeps<Track, Job>> = {}) {
  let jobs = [...initialJobs];
  const downloaded: string[] = [];
  const dropped: { id: string; attempts: number }[] = [];
  const rescheduled: { id: string; attempts: number }[] = [];

  const deps: JobRunDeps<Track, Job> = {
    getJobs: () => jobs,
    downloadTrack: async (track) => {
      downloaded.push(track.id);
    },
    onJobComplete: (completed) => {
      jobs = jobs.filter(item => item.id !== completed.id);
    },
    onJobRescheduled: (target, attempts) => {
      rescheduled.push({ id: target.id, attempts });
      jobs = jobs.map(item => (item.id === target.id ? { ...item, attempts } : item));
    },
    onJobDropped: (target, attempts) => {
      dropped.push({ id: target.id, attempts });
      jobs = jobs.filter(item => item.id !== target.id);
    },
    concurrency: 3,
    maxAttempts: 5,
    ...options,
  };

  return {
    deps,
    downloaded,
    dropped,
    rescheduled,
    remainingJobs: () => jobs,
    setJobs: (next: Job[]) => { jobs = next; },
    addJob: (next: Job) => { jobs = [...jobs, next]; },
  };
}

describe('download job runner', () => {
  it('downloads every track and clears the job', async () => {
    const h = harness([job('job-1', ['a', 'b'])]);

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.downloaded).toEqual(['a', 'b']);
    expect(h.remainingJobs()).toEqual([]);
  });

  it('drains every queued job in one run', async () => {
    const h = harness([job('job-1', ['a']), job('job-2', ['b'])]);

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.downloaded.sort()).toEqual(['a', 'b']);
    expect(h.remainingJobs()).toEqual([]);
  });

  it('downloads in chunks of the configured concurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    const h = harness([job('job-1', ['a', 'b', 'c', 'd', 'e'])], {
      concurrency: 2,
      downloadTrack: async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      },
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(peak).toBeLessThanOrEqual(2);
  });

  it('runs prepare before touching any track', async () => {
    const order: string[] = [];
    const h = harness([job('job-1', ['a'])], {
      prepare: async () => { order.push('prepare'); },
      downloadTrack: async (track) => { order.push(`download:${track.id}`); },
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(order).toEqual(['prepare', 'download:a']);
  });

  it('does not let one failing job wedge the rest of the queue', async () => {
    // The job stays queued with an attempt count, but the run continues.
    const h = harness([job('bad', ['x']), job('good', ['a'])], {
      downloadTrack: async (track) => {
        if (track.id === 'x') throw new Error('dead link');
      },
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.rescheduled).toEqual([{ id: 'bad', attempts: 1 }]);
    expect(h.remainingJobs().map(item => item.id)).toEqual(['bad']);
  });

  it('stops a job at the first failing chunk', async () => {
    const attempted: string[] = [];
    const h = harness([job('job-1', ['a', 'b', 'c', 'd'])], {
      concurrency: 2,
      downloadTrack: async (track) => {
        attempted.push(track.id);
        if (track.id === 'b') throw new Error('boom');
      },
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(attempted).toEqual(['a', 'b']);
  });

  it('drops a job once it runs out of attempts', async () => {
    const h = harness([job('bad', ['x'], 4)], {
      downloadTrack: async () => { throw new Error('boom'); },
      maxAttempts: 5,
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.dropped).toEqual([{ id: 'bad', attempts: 5 }]);
    expect(h.rescheduled).toEqual([]);
    expect(h.remainingJobs()).toEqual([]);
  });

  it('reschedules rather than drops while attempts remain', async () => {
    const h = harness([job('bad', ['x'], 3)], {
      downloadTrack: async () => { throw new Error('boom'); },
      maxAttempts: 5,
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.rescheduled).toEqual([{ id: 'bad', attempts: 4 }]);
    expect(h.dropped).toEqual([]);
  });

  it('retries a failed job only on a later run, not within the same one', async () => {
    const h = harness([job('bad', ['x'])], {
      downloadTrack: async () => { throw new Error('boom'); },
    });

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.rescheduled).toHaveLength(1);
  });

  it('makes a reentrant caller wait for the in-flight run to finish', async () => {
    // The caller's promise must not resolve before the work is done: callers
    // await processDownloadQueue() expecting the job they enqueued to be
    // processed by the time it returns.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let started = 0;

    const h = harness([job('job-1', ['a'])], {
      downloadTrack: async () => {
        started += 1;
        await gate;
      },
    });
    const runner = createDownloadJobRunner<Track, Job>();

    const first = runner.run(h.deps);
    await Promise.resolve();

    let secondResolved = false;
    const second = runner.run(h.deps).then(() => { secondResolved = true; });

    // Let any premature resolution settle before asserting it did not happen.
    await Promise.resolve();
    await Promise.resolve();
    expect(secondResolved).toBe(false);
    expect(started).toBe(1);

    release();
    await Promise.all([first, second]);
    expect(secondResolved).toBe(true);
  });

  it('runs another pass for a job that appeared after the loop gave up', async () => {
    // The rerun window. A job enqueued after the drain loop took its last look
    // but before the run promise settled is invisible to that pass; without a
    // second pass it sat unprocessed until the next app foreground. The
    // getJobs counter reproduces exactly that ordering.
    const runner = createDownloadJobRunner<Track, Job>();
    const downloaded: string[] = [];
    let jobs: Job[] = [job('job-1', ['a'])];
    let looks = 0;

    const deps: JobRunDeps<Track, Job> = {
      getJobs: () => {
        looks += 1;
        const current = jobs;
        if (looks === 2) {
          // The loop is about to see an empty queue and break. Enqueue behind
          // its back, the way enqueueDownloadJob does mid-run.
          queueMicrotask(() => {
            jobs = [job('job-2', ['b'])];
            void runner.run(deps);
          });
        }
        return current;
      },
      downloadTrack: async (track) => { downloaded.push(track.id); },
      onJobComplete: (completed) => {
        jobs = jobs.filter(item => item.id !== completed.id);
      },
      onJobRescheduled: () => {},
      onJobDropped: () => {},
      concurrency: 3,
      maxAttempts: 5,
    };

    await runner.run(deps);
    // Let the reentrant call's own pass finish.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(downloaded).toEqual(['a', 'b']);
  });

  it('reports whether a pass is draining', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const h = harness([job('job-1', ['a'])], {
      downloadTrack: async () => { await gate; },
    });
    const runner = createDownloadJobRunner<Track, Job>();

    expect(runner.isRunning()).toBe(false);
    const running = runner.run(h.deps);
    await Promise.resolve();
    expect(runner.isRunning()).toBe(true);

    release();
    await running;
    expect(runner.isRunning()).toBe(false);
  });

  it('does nothing when the queue is empty', async () => {
    const h = harness([]);

    await createDownloadJobRunner<Track, Job>().run(h.deps);

    expect(h.downloaded).toEqual([]);
  });
});
