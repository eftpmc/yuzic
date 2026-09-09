import {
  serverFetch,
  setClientCertificateActive,
  isClientCertificateActive,
} from './serverFetch';

/**
 * The point of these: a certificate that reaches the audio engine but not the
 * API requests leaves mutual TLS unreachable, because the login that precedes
 * every track is the request the server refuses first. That was the shipped
 * state once. So what is checked here is *which transport a request took*.
 */

const mockRequest = jest.fn();
jest.mock(
  'yuzic-engine',
  () => ({
    YuzicEngine: {
      clientCertificateRequest: (...args: unknown[]) => mockRequest(...args),
    },
  }),
  { virtual: true }
);

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('serverFetch', () => {
  const globalFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = globalFetch as unknown as typeof fetch;
    setClientCertificateActive(false);
  });

  it('uses the platform fetch when no certificate is active', async () => {
    globalFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await serverFetch('https://music.example/rest/ping', { method: 'GET' });

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('routes through the engine when a certificate is active', async () => {
    setClientCertificateActive(true);
    mockRequest.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      bodyBase64: b64('{"status":"ok"}'),
    });

    const res = await serverFetch('https://music.example/rest/ping', {
      method: 'GET',
      headers: { 'X-Test': '1' },
    });

    expect(globalFetch).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://music.example/rest/ping',
      method: 'GET',
      headers: { 'X-Test': '1' },
      bodyBase64: null,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns a non-2xx as a Response rather than throwing', async () => {
    // An HTTP error is an answer, and every caller here reads res.ok. Throwing
    // would make an unauthorised server look like an unreachable one.
    setClientCertificateActive(true);
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {},
      bodyBase64: b64('nope'),
    });

    const res = await serverFetch('https://music.example/rest/ping');

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('carries a request body across as base64', async () => {
    setClientCertificateActive(true);
    mockRequest.mockResolvedValue({ status: 200, headers: {}, bodyBase64: '' });

    await serverFetch('https://music.example/Users/AuthenticateByName', {
      method: 'POST',
      body: JSON.stringify({ Username: 'zack' }),
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        bodyBase64: b64('{"Username":"zack"}'),
      })
    );
  });

  it('preserves bytes that are not text, so artwork survives the round trip', async () => {
    setClientCertificateActive(true);
    // A PNG header — the first bytes are outside anything UTF-8 would keep.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    mockRequest.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'image/png' },
      bodyBase64: Buffer.from(png).toString('base64'),
    });

    const res = await serverFetch('https://music.example/rest/getCoverArt');
    const bytes = new Uint8Array(await res.arrayBuffer());

    expect(Array.from(bytes)).toEqual(Array.from(png));
  });

  it('stops routing through the engine once the certificate is cleared', async () => {
    // Switching to a server without a certificate must actively stop using the
    // old one, or its requests present an identity issued for somewhere else.
    setClientCertificateActive(true);
    expect(isClientCertificateActive()).toBe(true);

    setClientCertificateActive(false);
    globalFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await serverFetch('https://other.example/rest/ping');

    expect(mockRequest).not.toHaveBeenCalled();
    expect(globalFetch).toHaveBeenCalledTimes(1);
  });
});
