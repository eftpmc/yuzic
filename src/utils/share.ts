import { Platform, Share } from 'react-native';

/**
 * Opens the OS share sheet with a URL. Returns true when the user actually
 * dispatched a share, false when they dismissed or something went wrong —
 * callers can use that to dismiss a bottom sheet only on success.
 *
 * iOS puts the URL in a preview above the message, Android needs the URL
 * baked into `message` (its share intent doesn't have a URL slot). Doing
 * both keeps the caller from having to platform-switch.
 */
export async function shareItem(input: {
  url: string;
  title?: string;
  message?: string;
}): Promise<boolean> {
  try {
    const messageWithUrl = input.message
      ? `${input.message}\n${input.url}`
      : input.url;
    const res = await Share.share(
      Platform.OS === 'ios'
        ? { url: input.url, message: input.message ?? input.url, title: input.title }
        : { message: messageWithUrl, title: input.title }
    );
    return res.action === Share.sharedAction;
  } catch {
    return false;
  }
}
