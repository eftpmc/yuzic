import Constants from 'expo-constants';

/**
 * The running app's version, from the Expo manifest.
 *
 * Kept here rather than read inline so modules that report it to a service —
 * scrobble clients identifying themselves — don't have to depend on
 * expo-constants themselves.
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? 'unknown';
