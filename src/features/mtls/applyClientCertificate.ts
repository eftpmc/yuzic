import { Platform } from 'react-native';
import { loadClientCertificate } from './clientCertificateStore';
import { setClientCertificateActive } from './serverFetch';


/**
 * Hand the active server's client certificate to the audio engine, or clear it.
 *
 * Called whenever the active server changes, and once at startup. The engine
 * keeps the certificate until told otherwise, so switching from a server that
 * has one to a server that does not has to actively clear it — otherwise the
 * second server's requests would present the first server's identity, which is
 * a client authenticating to a machine its certificate was never issued for.
 *
 * Failures are reported to the caller rather than thrown at the point of a
 * server switch: a certificate that will not load should not stop someone
 * changing servers, and the screen that owns the certificate is the place that
 * can say something useful about it.
 */
export type ApplyResult =
  | { ok: true; applied: boolean }
  | { ok: false; reason: 'unsupported' | 'failed'; error?: unknown };

/** The slice of the engine this needs — narrowed so tests need no module. */
export interface ClientCertificateTarget {
  setClientCertificate(pkcs12Base64: string | null, password: string | null): Promise<void>;
}

export async function applyClientCertificate(
  engine: ClientCertificateTarget,
  serverId: string | null
): Promise<ApplyResult> {
  // Android's half of mutual TLS is not built — the method is absent there
  // rather than inert, so calling it would reject at the bridge. Checked here
  // rather than swallowing that rejection, so "not supported yet" and "your
  // certificate is wrong" stay different answers.
  if (Platform.OS !== 'ios') return { ok: false, reason: 'unsupported' };

  try {
    const stored = serverId ? await loadClientCertificate(serverId) : null;
    if (!stored) {
      await engine.setClientCertificate(null, null);
      setClientCertificateActive(false);
      return { ok: true, applied: false };
    }
    await engine.setClientCertificate(stored.pkcs12Base64, stored.password);
    // Only after the engine has accepted it. Routing the API requests through
    // the certificate transport before that would send them at a session with
    // no identity, which fails in exactly the way this feature exists to fix.
    setClientCertificateActive(true);
    return { ok: true, applied: true };
  } catch (error) {
    // The engine rejects a blob it cannot decrypt. Leaving a half-applied
    // certificate in place would be worse than none: clear it so the failure
    // is a clean "no certificate" rather than an identity nobody chose.
    setClientCertificateActive(false);
    try {
      await engine.setClientCertificate(null, null);
    } catch {
      // Nothing more to try, and the original failure is the one worth
      // reporting.
    }
    return { ok: false, reason: 'failed', error };
  }
}
