import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/useTheme';
import { useExplore } from '@/contexts/ExploreContext';
import { useNavigation } from '@react-navigation/native';
import MediaTile from './components/MediaTile';
import LoaderCard from './components/LoaderCard';

import {
  ExternalArtistBase,
  ExternalAlbumBase,
} from '@/types';

const H_PADDING = 16;
const VISIBLE_ITEMS = 2.5;

const ARTIST_TARGET = 12;
const ALBUM_TARGET = 12;

type Props = {
  onBack: () => void;
};

function Section({
  title,
  children,
  isDarkMode,
}: {
  title: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          isDarkMode && styles.sectionTitleDark,
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function Explore({ onBack }: Props) {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { artistPool, albumPool, isLoading } = useExplore();

  const screenWidth = Dimensions.get('window').width;
  const gridGap = 12;

  const gridItemWidth =
    (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS;

  const tileHeight =
    gridItemWidth + 8 + 14 + 4 + 12;

  const artistsReady =
    artistPool.length >= ARTIST_TARGET || !isLoading;

  const albumsReady =
    albumPool.length >= ALBUM_TARGET || !isLoading;

  const artists = useMemo(
    () => artistPool.slice(0, ARTIST_TARGET),
    [artistPool]
  );

  const albums = useMemo(
    () => albumPool.slice(0, ALBUM_TARGET),
    [albumPool]
  );

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 150 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Section title="Artists for You" isDarkMode={isDarkMode}>
        {!artistsReady ? (
          <View style={styles.rowLoaderWrapper}>
            <LoaderCard
              width={screenWidth - H_PADDING * 2}
              height={tileHeight}
              radius={14}
            />
          </View>
        ) : (
          <FlashList<ExternalArtistBase>
            horizontal
            data={artists}
            keyExtractor={(item) => item.id}
            estimatedItemSize={gridItemWidth}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PADDING }}
            ItemSeparatorComponent={() => (
              <View style={{ width: gridGap }} />
            )}
            renderItem={({ item }) => (
              <MediaTile
                cover={item.cover}
                title={item.name}
                subtitle={item.subtext}
                size={gridItemWidth}
                radius={gridItemWidth / 2}
                onPress={() =>
                  navigation.navigate('artistView', {
                    id: item.id,
                  })
                }
              />
            )}
          />
        )}
      </Section>

      <Section title="Albums You Might Like" isDarkMode={isDarkMode}>
        {!albumsReady ? (
          <View style={styles.rowLoaderWrapper}>
            <LoaderCard
              width={screenWidth - H_PADDING * 2}
              height={tileHeight}
              radius={14}
            />
          </View>
        ) : (
          <FlashList<ExternalAlbumBase>
            horizontal
            data={albums}
            keyExtractor={(item) => item.id}
            estimatedItemSize={gridItemWidth}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PADDING }}
            ItemSeparatorComponent={() => (
              <View style={{ width: gridGap }} />
            )}
            renderItem={({ item }) => (
              <MediaTile
                cover={item.cover}
                title={item.title}
                subtitle={item.subtext}
                size={gridItemWidth}
                radius={14}
                onPress={() =>
                  navigation.navigate('externalAlbumView', {
                    albumId: item.id,
                  })
                }
              />
            )}
          />
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  content: {
    paddingTop: 12,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: H_PADDING,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  rowLoaderWrapper: {
    paddingHorizontal: H_PADDING,
  },
});