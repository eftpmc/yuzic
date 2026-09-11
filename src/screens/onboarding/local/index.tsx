import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@backpackapp-io/react-native-toast';
import { FileMusic } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { importLocalFiles } from '@/api/local/store';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { iconSize, onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

/** First-run local-library import. Files are copied into app-private storage,
 * so a document provider revoking its temporary URI cannot break playback. */
export default function LocalImport() {
  const { t } = useTranslation();
  const router = useRouter();
  const rad = useRadius();
  const [importing, setImporting] = useState(false);

  const pick = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/flac', 'audio/mp4', 'audio/x-m4a'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const outcome = await importLocalFiles(result.assets);
      if (outcome.imported) toast.success(t('onboarding.local.imported', { count: outcome.imported }));
      if (outcome.unsupported) toast.error(t('onboarding.local.unsupported', { count: outcome.unsupported }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('onboarding.local.importFailed'));
    } finally { setImporting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FileMusic size={iconSize.emptyState} color={onDark.text} />
        <Text style={styles.title}>{t('onboarding.local.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.local.subtitle')}</Text>
        <Text style={styles.supported}>{t('onboarding.local.supported')}</Text>
      </View>
      <View style={styles.actions}>
        <Touchable style={[styles.primary, { borderRadius: rad.pill }, importing && styles.disabled]} onPress={pick} disabled={importing}>
          {importing ? <SpinningLoaderCircle size={iconSize.row} color={onDark.background} /> : <Text style={styles.primaryText}>{t('onboarding.local.choose')}</Text>}
        </Touchable>
        <Touchable style={[styles.secondary, { borderRadius: rad.pill }]} onPress={() => router.replace('/(home)/(tabs)/(home)')}>
          <Text style={styles.secondaryText}>{t('onboarding.local.finish')}</Text>
        </Touchable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: onDark.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.roomy, gap: spacing.md },
  title: { ...typography.display, color: onDark.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: onDark.mutedText, textAlign: 'center' },
  supported: { ...typography.caption, color: onDark.subtext, textAlign: 'center' },
  actions: { padding: spacing.roomy, gap: spacing.md },
  primary: { backgroundColor: onDark.text, width: '100%', paddingVertical: spacing.lg, alignItems: 'center' },
  primaryText: { ...typography.sheetTitle, color: '#000' },
  secondary: { backgroundColor: onDark.border, width: '100%', paddingVertical: spacing.lg, alignItems: 'center' },
  secondaryText: { ...typography.sheetTitle, color: onDark.text },
  disabled: { opacity: 0.6 },
});
