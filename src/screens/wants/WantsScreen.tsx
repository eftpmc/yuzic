import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, X } from 'lucide-react-native';

import Header from '@/screens/settings/components/Header';
import MediaListRow from '@/components/MediaListRow';
import Touchable from '@/components/Touchable';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { hitSlopFor, iconSize, spacing, typography } from '@/constants/design';
import { useManualAddWantSheet } from '@/components/options/ManualAddWantSheet';
import { selectWantsForActiveServer } from '@/utils/redux/selectors/wantsSelectors';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { removeWant, type Want } from '@/utils/redux/slices/wantsSlice';

/**
 * Wants library screen: the save-only wishlist for tracks/albums nothing has
 * resolved yet. Works with zero downloaders connected — a Want is just a
 * saved intent (title/artist), and acquisition (a Get) is a separate,
 * later action, never triggered from here.
 *
 * The header action opens `ManualAddWantSheet` via `useManualAddWantSheet()`
 * (built in C2, unwired until now) — the documented entry point for adding a
 * Want with nothing resolved on-device.
 */
const WantsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const scrollClearance = useScrollClearance();
  const wants = useSelector(selectWantsForActiveServer);
  const activeServerId = useSelector(selectActiveServerId);
  const { open, sheet } = useManualAddWantSheet();

  const handleRemove = useCallback((want: Want) => {
    if (!activeServerId) return;
    dispatch(removeWant({ serverId: activeServerId, localId: want.localId }));
  }, [dispatch, activeServerId]);

  const renderItem = useCallback(
    ({ item }: { item: Want }) => (
      <MediaListRow
        testID="want-row"
        title={item.title}
        subtitle={item.artist}
        cover={{ kind: 'none' }}
        trailing={
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.wants.remove', { title: item.title })}
            hitSlop={hitSlopFor(24)}
            onPress={() => handleRemove(item)}
            style={styles.removeButton}
          >
            <X size={iconSize.row} color={colors.subtext} />
          </Touchable>
        }
      />
    ),
    [colors.subtext, handleRemove, t]
  );

  const headerAction = (
    <Touchable
      testID="wants-manual-add"
      accessibilityRole="button"
      accessibilityLabel={t('wants.manualAdd')}
      onPress={open}
      hitSlop={hitSlopFor(iconSize.header)}
    >
      <Plus size={iconSize.header} color={colors.secondary} />
    </Touchable>
  );

  return (
    <SafeAreaView testID="wants-screen" edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('wants.title')} rightAction={headerAction} />
      {wants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('wants.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={wants}
          keyExtractor={(item) => item.localId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: scrollClearance }}
        />
      )}
      {sheet}
    </SafeAreaView>
  );
};

export default WantsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { paddingHorizontal: spacing.page, paddingTop: spacing.xl },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center' },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
