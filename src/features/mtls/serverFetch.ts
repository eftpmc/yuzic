import { Platform } from 'react-native';

/**
 * `fetch` for the active music server, which may sit behind mutual TLS.
 *
 * The server clients used to call the global `fetch` directly. That works for
 * every server that does not ask the client for a certificate — which is
 * almost all of them — and cannot work for one that does: React Native's
 * `fetch` has no client identity and no way to be given one, so the handshake
 * ends and the request reads as "cannot connect".
 *
 * The engine already holds the certificate, because it needs it to stream
 * audio. This routes the *other* requests — logging in, listing a library,
 * artwork — through the engine's native HTTP path so they present the same
 * identity. It is not a general-purpose client: it exists so mutual TLS is
 * reachable at all, and every server without a certificate keeps taking the
 * ordinary `fetch` path with no behaviour change.
 *
 * Deliberately shaped as a drop-in for `fetch` and returning a real
 * `Response`, so the call sites stay one line and keep reading `res.ok`,
 * `res.json()` and `res.text()` exactly as before.
 */

/** Set by `useClientCertificate` as the active server changes. */
let certificateActive = false;

/**
 * Whether requests should currently go through the certificate transport.
 *
 * Module state rather than React state on purpose: the API clients are plain
 * functions built outside the component tree, and threading a hook value into
 * every one of them would mean rebuilding each client on every render. There
 * is exactly one active server at a time, so there is exactly one answer.
 */
export function setClientCertificateActive(active: boolean): void {
  certificateActive = Platform.OS === 'ios' && active;
}

export function isClientCertificateActive(): boolean {
  return certificateActive;
}

/** The engine, required lazily for the same reason the rest of the app does:
 *  pulling the native module in at import time runs before it is registered. */
function engine() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('yuzic-engine') as typeof import('yuzic-engine')).YuzicEngine;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return global.btoa(binary);
}

/** Flatten `HeadersInit` into the plain record the bridge takes. */
function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  return { ...(headers as Record<string, string>) };
}

async function bodyToBase64(body: BodyInit | null | undefined): Promise<string | null> {
  if (body == null) return null;
  if (typeof body === 'string') return global.btoa(unescape(encodeURIComponent(body)));
  if (body instanceof ArrayBuffer) return bytesToBase64(new Uint8Array(body));
  if (ArrayBuffer.isView(body)) {
    return bytesToBase64(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
  }
  // URLSearchParams and anything else stringifiable. A stream body is not
  // supported and is not something the server clients send.
  return global.btoa(unescape(encodeURIComponent(String(body))));
}

/**
 * Fetch through the client certificate when one is set, and through the
 * platform's `fetch` when not.
 *
 * A non-2xx comes back as a `Response` with that status rather than throwing,
 * which is what `fetch` does and what every caller here already handles.
 */
export async function serverFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (!certificateActive) return fetch(input, init);

  const result = await engine().clientCertificateRequest({
    url: input,
    method: init.method ?? 'GET',
    headers: toHeaderRecord(init.headers),
    bodyBase64: await bodyToBase64(init.body),
  });

  // Rebuilt as a real Response so `res.ok`, `res.json()` and `res.text()` keep
  // working at the call sites unchanged. The body goes back as bytes rather
  // than as a string because it may be artwork.
  //
  // Handed over as the underlying ArrayBuffer: React Native's `Response` types
  // accept a buffer but not a typed-array view, and slicing to the view's own
  // bounds is what keeps that equivalent for a subarray.
  const bytes = base64ToBytes(result.bodyBase64);
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return new Response(body, {
    status: result.status,
    headers: result.headers,
  });
}
