import { createRequestCoalescer } from './coalesceRequest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createRequestCoalescer', () => {
  it('runs the operation once for concurrent calls on the same key', async () => {
    const coalesce = createRequestCoalescer<string>();
    const gate = deferred<string>();
    const operation = jest.fn(() => gate.promise);

    const first = coalesce('k', operation);
    const second = coalesce('k', operation);
    gate.resolve('done');

    await expect(first).resolves.toBe('done');
    await expect(second).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('keeps different keys independent', async () => {
    const coalesce = createRequestCoalescer<string>();
    const operation = jest.fn((value: string) => Promise.resolve(value));

    const [a, b] = await Promise.all([
      coalesce('a', () => operation('a')),
      coalesce('b', () => operation('b')),
    ]);

    expect([a, b]).toEqual(['a', 'b']);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('re-runs a key once the previous call settled', async () => {
    const coalesce = createRequestCoalescer<string>();
    const operation = jest.fn(() => Promise.resolve('done'));

    await coalesce('k', operation);
    await coalesce('k', operation);

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not cache a rejection for later callers', async () => {
    const coalesce = createRequestCoalescer<string>();
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(coalesce('k', operation)).rejects.toThrow('boom');

    await expect(coalesce('k', operation)).resolves.toBe('recovered');
  });

  it('shares a rejection with concurrent callers', async () => {
    const coalesce = createRequestCoalescer<string>();
    const gate = deferred<string>();
    const operation = jest.fn(() => gate.promise);

    const first = coalesce('k', operation);
    const second = coalesce('k', operation);
    const assertions = Promise.all([
      expect(first).rejects.toThrow('boom'),
      expect(second).rejects.toThrow('boom'),
    ]);
    gate.reject(new Error('boom'));

    await assertions;
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
