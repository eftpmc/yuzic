import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { hitSlopFor, iconSize, statusColor } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { useTranslation } from 'react-i18next';
import { downloaderQueueStyles as styles, type RowCancelHelpers } from './DownloaderSettingsScreen';

type Props = {
  title: string;
  subtitle: string;
  percent: number;
  cancel: RowCancelHelpers;
  completed?: boolean;
  onPress?: () => void;
  warningMessages?: { title: string }[];
};

export default function DownloaderQueueRow({ title, subtitle, percent, cancel, completed = false, onPress, warningMessages }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const content = (
    <>
      <View style={styles.itemHeader}>
        <View style={styles.itemMain}>
          <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.headerTrailing}>
          {completed ? <CheckCircle size={iconSize.inline} color={statusColor.success} /> : <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>}
          {cancel.requestCancel && (cancel.isCancelling ? (
            <View style={styles.cancelButton}><SpinningLoaderCircle size={iconSize.row} color={colors.subtext} /></View>
          ) : (
            <Touchable feedback="control" style={styles.cancelButton} hitSlop={hitSlopFor(24)} onPress={() => cancel.requestCancel!(title)} accessibilityRole="button" accessibilityLabel={t('settings.downloaders.cancelAria', { title })}>
              <X size={iconSize.row} color={statusColor.destructive} />
            </Touchable>
          ))}
        </View>
      </View>
      {!completed && <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: rad.pill }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.themeColor, width: `${percent}%` }]} />
      </View>}
      {warningMessages && <View style={[styles.warningContainer, { backgroundColor: colors.muted }]}>
        {warningMessages.map((message, index) => <Text key={index} style={[styles.warningMessage, { color: colors.subtext }]}>• {message.title}</Text>)}
      </View>}
    </>
  );
  return onPress ? <Pressable style={styles.itemRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('a11y.detail.cancelDownload')}>{content}</Pressable> : <View style={styles.itemRow}>{content}</View>;
}
