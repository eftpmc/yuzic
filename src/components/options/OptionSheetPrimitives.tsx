import React from 'react';
import { radius, spacing, typography } from '@/constants/design';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import type { CoverSource } from '@/types';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';

type HeaderProps = {
  cover: CoverSource;
  title: string;
  subtitle?: string;
  titleLines?: number;
};

export function OptionSheetHeader({ cover, title, subtitle, titleLines = 1 }: HeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <MediaImage cover={cover} size="grid" style={styles.cover} />
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={titleLines}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

type RowProps = {
  icon?: React.ReactNode;
  label: string;
  /** Optional second line under the label */
  description?: string;
  onPress?: () => void;
  /** Disables presses without changing appearance; pair with dimRow/dimLabel */
  disabled?: boolean;
  /** Fade the whole row (unavailable actions, e.g. while songs load) */
  dimRow?: boolean;
  /** Fade only the label (completed/in-flight actions, e.g. downloaded) */
  dimLabel?: boolean;
  /** Replace the icon with a spinner */
  loading?: boolean;
  labelColor?: string;
  trailing?: React.ReactNode;
};

export function OptionSheetRow({
  icon,
  label,
  description,
  onPress,
  disabled,
  dimRow,
  dimLabel,
  loading,
  labelColor,
  trailing,
}: RowProps) {
  const { colors } = useTheme();
  const leading = loading ? <SpinningLoaderCircle size={18} color={colors.subtext} /> : icon;

  return (
    <Touchable
      style={[styles.option, dimRow && styles.optionDimmed]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      {leading}
      <View style={[styles.optionBody, !leading && styles.optionBodyNoIcon]}>
        <Text
          style={[
            styles.optionText,
            { color: labelColor ?? colors.secondary },
            dimLabel && styles.optionTextDimmed,
          ]}
        >
          {label}
        </Text>
        {description !== undefined && (
          <Text style={[styles.optionDescription, { color: colors.subtext }]}>{description}</Text>
        )}
      </View>
      {trailing}
    </Touchable>
  );
}

type InfoRowProps = {
  label: string;
  value: string | number;
  valueLines?: number;
};

export function OptionSheetInfoRow({ label, value, valueLines }: InfoRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.subtext }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.secondary }]} numberOfLines={valueLines}>
        {value}
      </Text>
    </View>
  );
}

type SectionLabelProps = {
  label: string;
  /** Adds top margin when the label follows another section */
  spaced?: boolean;
};

export function OptionSheetSectionLabel({ label, spaced }: SectionLabelProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.sectionLabel, { color: colors.subtext }, spaced && styles.sectionLabelSpaced]}>
      {label}
    </Text>
  );
}

export function OptionSheetDivider() {
  const { colors } = useTheme();

  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

type ChipsRowProps = {
  label: string;
  values: string[];
};

export function OptionSheetChipsRow({ label, values }: ChipsRowProps) {
  const { isDarkMode, colors } = useTheme();
  const chipBg = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.chipsRow}>
      <Text style={[styles.infoLabel, { color: colors.subtext }]}>{label}</Text>
      <View style={styles.chipsList}>
        {values.map((value, i) => (
          <View key={`${value}-${i}`} style={[styles.chip, { backgroundColor: chipBg }]}>
            <Text style={[styles.chipText, { color: colors.secondary }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Shared scaffold styles for BottomSheetModal-based option sheets */
export const optionSheetStyles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
});

/** Sheet surface color: elevated card in dark mode, plain background in light */
export function useOptionSheetBackground() {
  const { isDarkMode, colors } = useTheme();
  return { backgroundColor: isDarkMode ? colors.card : colors.background };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { ...typography.rowTitle },
  subtitle: { ...typography.rowSubtitle, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionDimmed: {
    opacity: 0.55,
  },
  optionBody: {
    flex: 1,
    marginLeft: 16,
  },
  optionBodyNoIcon: {
    marginLeft: 0,
  },
  optionText: { ...typography.rowTitle },
  optionTextDimmed: {
    opacity: 0.6,
  },
  optionDescription: {
    ...typography.caption,
    marginTop: 1,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginBottom: 8,
  },
  sectionLabelSpaced: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { ...typography.rowSubtitle },
  infoValue: { ...typography.rowSubtitle, fontWeight: '500', marginLeft: 12, flex: 1, textAlign: 'right' },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  chipsList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.inlineGap,
    marginLeft: 12,
    justifyContent: 'flex-end',
    alignContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.card,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '500',
  },
});
