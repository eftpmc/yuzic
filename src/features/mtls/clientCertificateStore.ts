import * as SecureStore from 'expo-secure-store';

/**
 * Where a server's client certificate lives.
 *
 * The certificate and its private key arrive together in a PKCS#12 file. That
 * file is the key — anyone holding it and its password can authenticate as the
 * user to their server — so it goes in the system keychain and nowhere else.
 * Explicitly *not* MMKV, which is where the rest of the app's settings live:
 * MMKV is an unencrypted file in the app container, which is the right place
 * for a preferred sort order and the wrong place for this.
 *
 * Only metadata goes in the Server record — a file name and the certificate's
 * common name, so a screen can say which certificate is in use without the
 * key material leaving here.
 */

/** What is handed to the native layer to authenticate with. */
export interface StoredClientCertificate {
  /** The PKCS#12 file, base64'd — the form the bridge takes. */
  pkcs12Base64: string;
  /** Decrypts the blob. Not a credential to check; without it the file is inert. */
  password: string;
}

/**
 * Keyed per server, because a certificate is issued for one.
 *
 * SecureStore keys are restricted to word characters, `.` and `-`; a server id
 * is a uuid, so this is safe, but the prefix keeps it obvious in a keychain
 * dump what the entry is for.
 */
function keyFor(serverId: string, part: 'blob' | 'password'): string {
  return `mtls.${serverId.replace(/[^\w.-]/g, '_')}.${part}`;
}

/**
 * Two entries rather than one JSON blob.
 *
 * SecureStore caps a value at 2048 bytes on Android before it silently falls
 * back to a different store, and a PKCS#12 with a full chain runs to several
 * kilobytes base64'd. Splitting does not fix that on its own — the blob is
 * still the big half — but keeping the password in its own entry means a
 * failure to write the blob cannot leave a half-written record that looks
 * complete.
 */
export async function saveClientCertificate(
  serverId: string,
  certificate: StoredClientCertificate
): Promise<void> {
  await SecureStore.setItemAsync(keyFor(serverId, 'blob'), certificate.pkcs12Base64, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await SecureStore.setItemAsync(keyFor(serverId, 'password'), certificate.password, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

/**
 * `AFTER_FIRST_UNLOCK` rather than the default, deliberately.
 *
 * The default is `WHEN_UNLOCKED`, which makes the item unreadable while the
 * device is locked — and playback continues while the device is locked. A
 * track that begins on the lock screen would fail to authenticate for a reason
 * nothing could explain. `AFTER_FIRST_UNLOCK` keeps it readable from the first
 * unlock after boot, which is the same trade the system makes for background
 * work generally.
 */
export async function loadClientCertificate(
  serverId: string
): Promise<StoredClientCertificate | null> {
  const pkcs12Base64 = await SecureStore.getItemAsync(keyFor(serverId, 'blob'));
  if (!pkcs12Base64) return null;
  const password = await SecureStore.getItemAsync(keyFor(serverId, 'password'));
  // A blob with no password is a half-written record — treated as absent
  // rather than passed on, since it can only fail to decrypt.
  if (password === null) return null;
  return { pkcs12Base64, password };
}

export async function removeClientCertificate(serverId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(serverId, 'blob'));
  await SecureStore.deleteItemAsync(keyFor(serverId, 'password'));
}

export async function hasClientCertificate(serverId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(keyFor(serverId, 'blob'))) !== null;
}
