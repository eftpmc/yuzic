import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X } from 'lucide-react-native';

import Header from '@/screens/settings/components/Header';
import MediaListRow from '@/components/MediaListRow';
import EmptyState from '@/components/EmptyState';
import Touchable from '@/components/Touchable';
import { useTheme } from '@/hooks/useTheme';
import { useScrollClearance } from '@/hooks/useScrollClearance';
import { hitSlopFor, iconSize, spacing } from '@/constants/design';
import { selectWantsForActiveServer } from '@/utils/redux/selectors/wantsSelectors';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { removeWant, type Want } from '@/utils/redux/slices/wantsSlice';

/**
 * Wants library screen: the save-only wishlist for tracks/albums nothing has
 * resolved yet. Works with zero downloaders connected — a Want is just a
 * saved intent (title/artist), and acquisition (a Get) is a separate,
 * later action, never triggered from here.
 *
 * Wants are created by saving a *resolved* result — from Search or a song's
 * options — so this screen has no add control of its own. The empty state
 * points at Search, the one place a want is born with real metadata; a
 * free-text "type a title" box would only manufacture unmatchable rows.
 */
const WantsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const scrollClearance = useScrollClearance();
  const wants = useSelector(selectWantsForActiveServer);
  const activeServerId = useSelector(selectActiveServerId);

  const handleRemove = useCallback((want: Want) => {
    if (!activeServerId) return;
    dispatch(removeWant({ serverId: activeServerId, localId: want.localId }));
  }, [dispatch, activeServerId]);

  const goToSearch = useCallback(() => {
    router.navigate('/(home)/(tabs)/(search)');
  }, [router]);

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

  return (
    <SafeAreaView testID="wants-screen" edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('wants.title')} />
      {wants.length === 0 ? (
        <EmptyState
          icon={<Search size={iconSize.emptyState} color={colors.subtext} />}
          message={t('wants.empty')}
          action={{ label: t('wants.searchAction'), onPress: goToSearch }}
        />
      ) : (
        <FlatList
          data={wants}
          keyExtractor={(item) => item.localId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: scrollClearance }}
        />
      )}
    </SafeAreaView>
  );
};

export default WantsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
