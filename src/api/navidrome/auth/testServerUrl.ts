import i18n from '@/i18n';
import { serverFetch } from '@/features/mtls/serverFetch';

export async function testServerUrl(
  url: string
): Promise<{ success: boolean; message?: string }> {
  if (!url) return { success: false, message: i18n.t('onboarding.connect.serverUrlRequired') };

  try {
    const res = await serverFetch(url);
    return res.ok
      ? { success: true }
      : { success: false, message: i18n.t('onboarding.connect.serverErrorStatus', { status: res.status }) };
  } catch {
    return { success: false, message: i18n.t('onboarding.connect.serverConnectionFailed') };
  }
}