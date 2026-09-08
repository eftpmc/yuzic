import { applyClientCertificate, type ClientCertificateTarget } from './applyClientCertificate';
import { loadClientCertificate } from './clientCertificateStore';

jest.mock('./clientCertificateStore', () => ({
  loadClientCertificate: jest.fn(),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const load = loadClientCertificate as jest.MockedFunction<typeof loadClientCertificate>;

function engine(): ClientCertificateTarget & { calls: (string | null)[][] } {
  const calls: (string | null)[][] = [];
  return {
    calls,
    async setClientCertificate(blob, password) {
      calls.push([blob, password]);
    },
  };
}

describe('applyClientCertificate', () => {
  beforeEach(() => load.mockReset());

  it('hands a stored certificate to the engine', async () => {
    load.mockResolvedValue({ pkcs12Base64: 'blob', password: 'pw' });
    const target = engine();

    const result = await applyClientCertificate(target, 'server-a');

    expect(result).toEqual({ ok: true, applied: true });
    expect(target.calls).toEqual([['blob', 'pw']]);
  });

  /**
   * The case that matters. The engine holds the certificate until told
   * otherwise, so a server with none has to actively clear it — otherwise the
   * second server's requests present the first server's identity, and a client
   * authenticates to a machine its certificate was never issued for.
   */
  it('clears the certificate for a server that has none', async () => {
    load.mockResolvedValue(null);
    const target = engine();

    const result = await applyClientCertificate(target, 'server-b');

    expect(result).toEqual({ ok: true, applied: false });
    expect(target.calls).toEqual([[null, null]]);
  });

  it('clears the certificate when there is no active server', async () => {
    const target = engine();

    await applyClientCertificate(target, null);

    expect(load).not.toHaveBeenCalled();
    expect(target.calls).toEqual([[null, null]]);
  });

  /**
   * A certificate the engine rejects must not be left half-applied: "no
   * certificate" is a clean state, an identity nobody chose is not.
   */
  it('clears the certificate when the engine rejects it', async () => {
    load.mockResolvedValue({ pkcs12Base64: 'not-a-p12', password: 'pw' });
    const calls: (string | null)[][] = [];
    const target: ClientCertificateTarget = {
      async setClientCertificate(blob, password) {
        calls.push([blob, password]);
        if (blob !== null) throw new Error('could not decrypt');
      },
    };

    const result = await applyClientCertificate(target, 'server-a');

    expect(result.ok).toBe(false);
    expect(calls).toEqual([
      ['not-a-p12', 'pw'],
      [null, null],
    ]);
  });

  it('reports a failure to read the store rather than throwing', async () => {
    load.mockRejectedValue(new Error('keychain unavailable'));

    const result = await applyClientCertificate(engine(), 'server-a');

    expect(result).toMatchObject({ ok: false, reason: 'failed' });
  });
});
