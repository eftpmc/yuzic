import * as amplitude from '@amplitude/analytics-react-native';
import { getUniqueId } from 'react-native-device-info'

let initialized = false;
let initializing = false;
let enabled = false;

export async function initAnalytics() {
  if (!enabled || initialized || initializing) return;

  initializing = true;

  try {
    const uniqID = await getUniqueId();
    await amplitude
      .init(
        '483138e19d670240cdc04411ad13aec9',
        uniqID,
        {
          disableCookies: true,
        }
      )
      .promise;

    initialized = true;
  } catch (err) {
    // Init failed (offline, native error, etc.)
    // Allow retry later
    initialized = false;
  } finally {
    initializing = false;
  }
}

export async function enableAnalytics() {
  if (enabled) return;
  enabled = true;
  await initAnalytics();
}

export function disableAnalytics() {
  enabled = false;
  initialized = false;
  initializing = false;

  try {
    amplitude.setUserId(undefined);
    amplitude.reset();
  } catch {
  }
}

export function track(
  eventName: string,
  properties?: Record<string, any>
) {
  if (!enabled || !initialized) return;

  try {
    amplitude.track(eventName, properties);
  } catch {
  }
}

export { amplitude };