import { onDark } from '@/constants/design';
import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useTranslation } from 'react-i18next';
import { Check, GripVertical } from 'lucide-react-native';

import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';

export type SettingsSource = {
  id: string;
  label: string;
  subtext: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

type Props = {
  sources: SettingsSource[];
  /** Persisted source IDs; newly available sources follow the known order. */
  sourceOrder?: string[];
  onOrderChange: (sourceIds: string[]) => void;
  pinnedSource?: { label: string; subtext: string };
};

/**
 * A feature-owned fallback chain. Its caller supplies the persisted ordering;
 * this component only exposes order when moving a source changes resolution.
 */
const SettingsSourceList: React.FC<Props> = ({ sources, sourceOrder = [], onOrderChange, pinnedSource }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const orderedSources = useMemo(() => {
    const position = new Map(sourceOrder.map((id, index) => [id, index]));
    return [...sources].sort((left, right) => (position.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  }, [sourceOrder, sources]);
  const enabledCount = useMemo(() => orderedSources.filter(source => source.enabled).length, [orderedSources]);
  const canReorder = enabledCount > 1;

  const renderSource = ({ item, drag, isActive }: RenderItemParams<SettingsSource>) => {
    const order = orderedSources.filter(source => source.enabled).findIndex(source => source.id === item.id) + 1;

    return (
      <View style={[styles.sourceRow, isActive && { backgroundColor: colors.background }]}>
        <View style={styles.sourceCopy}>
          <Text style={[styles.sourceLabel, { color: colors.secondary }]}>{item.label}</Text>
          <Text style={[styles.sourceSubtext, { color: colors.subtext }]}>{item.subtext}</Text>
        </View>
        <View style={styles.sourceControls}>
          {canReorder && item.enabled && (
            <Touchable
              testID={`source-drag-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.settings.reorderSource', { name: item.label })}
              onLongPress={drag}
              disabled={isActive}
              style={styles.dragHandle}
            >
              <Text style={[styles.orderText, { color: colors.subtext }]}>{order}</Text>
              <GripVertical size={iconSize.row} color={colors.border} />
            </Touchable>
          )}
          <Switch
            value={item.enabled}
            onValueChange={item.onEnabledChange}
            trackColor={{ true: colors.themeColor }}
            thumbColor={onDark.text}
          />
        </View>
      </View>
    );
  };

  return (
    <View>
      {pinnedSource && (
        <View style={styles.sourceRow} testID="settings-source-pinned">
          <View style={styles.sourceCopy}>
            <Text style={[styles.sourceLabel, { color: colors.secondary }]}>{pinnedSource.label}</Text>
            <Text style={[styles.sourceSubtext, { color: colors.subtext }]}>{pinnedSource.subtext}</Text>
          </View>
          <View style={[styles.alwaysFirst, { backgroundColor: colors.themeColor + '18', borderRadius: rad.pill }]}>
            <Check size={iconSize.badge} color={colors.themeColor} />
            <Text style={[styles.alwaysFirstText, { color: colors.themeColor }]}>First</Text>
          </View>
        </View>
      )}

      <DraggableFlatList
        data={orderedSources}
        keyExtractor={source => source.id}
        renderItem={renderSource}
        scrollEnabled={false}
        onDragEnd={({ data }) => onOrderChange(data.map(source => source.id))}
      />
    </View>
  );
};

export default SettingsSourceList;

const styles = StyleSheet.create({
  sourceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceLabel: { ...typography.rowTitle },
  sourceSubtext: { ...typography.caption, marginTop: spacing.xxs },
  sourceControls: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dragHandle: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxs, padding: spacing.xs },
  orderText: { ...typography.caption, fontWeight: '700' },
  alwaysFirst: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  alwaysFirstText: { ...typography.caption, fontWeight: '600' },
});
