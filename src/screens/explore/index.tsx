import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/useTheme';
import { MediaImage } from '@/components/MediaImage';
import { useExplore } from '@/contexts/ExploreContext';
import { useNavigation } from '@react-navigation/native';
import MediaTile from './components/MediaTile';
import {
  ExternalArtistBase,
  ExternalAlbumBase,
} from '@/types';

const H_PADDING = 16;
const VISIBLE_ITEMS = 2.5;

type Props = {
  onBack: () => void;
};

type PlaceholderItem = {
  __placeholder: true;
};

type ArtistItem = ExternalArtistBase | PlaceholderItem;
type AlbumItem = ExternalAlbumBase | PlaceholderItem;

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

const PlaceholderTile = React.memo(function PlaceholderTile({
  size,
  radius,
  isDarkMode,
}: {
  size: number;
  radius: number;
  isDarkMode: boolean;
}) {
  return (
    <View style={{ width: size }}>
      <MediaImage
        cover={{ kind: 'none' }}
        size="grid"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
        }}
      />
      <View
        style={[
          styles.skeletonLine,
          isDarkMode ? styles.skeletonDark : styles.skeletonLight,
          { width: '90%' },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          isDarkMode ? styles.skeletonDark : styles.skeletonLight,
          { width: '65%' },
        ]}
      />
    </View>
  );
});

export default function Explore({ onBack }: Props) {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { artistPool, albumPool } = useExplore();

  const screenWidth = Dimensions.get('window').width;
  const gridGap = 12;
  const gridItemWidth =
    (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS;

  const artistData: ArtistItem[] = artistPool.length
    ? artistPool
    : Array.from({ length: 6 }, () => ({ __placeholder: true }));

  const albumData: AlbumItem[] = albumPool.length
    ? albumPool
    : Array.from({ length: 6 }, () => ({ __placeholder: true }));

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
        <FlashList<ArtistItem>
          horizontal
          data={artistData}
          keyExtractor={(item, index) =>
            '__placeholder' in item
              ? `placeholder-artist-${index}`
              : item.id
          }
          estimatedItemSize={gridItemWidth}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => (
            <View style={{ width: gridGap }} />
          )}
          renderItem={({ item }) =>
            '__placeholder' in item ? (
              <PlaceholderTile
                size={gridItemWidth}
                radius={gridItemWidth / 2}
                isDarkMode={isDarkMode}
              />
            ) : (
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
            )
          }
        />
      </Section>

      <Section title="Albums You Might Like" isDarkMode={isDarkMode}>
        <FlashList<AlbumItem>
          horizontal
          data={albumData}
          keyExtractor={(item, index) =>
            '__placeholder' in item
              ? `placeholder-album-${index}`
              : item.id
          }
          estimatedItemSize={gridItemWidth}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => (
            <View style={{ width: gridGap }} />
          )}
          renderItem={({ item }) =>
            '__placeholder' in item ? (
              <PlaceholderTile
                size={gridItemWidth}
                radius={14}
                isDarkMode={isDarkMode}
              />
            ) : (
              <MediaTile
                cover={item.cover}
                title={item.title}
                subtitle={item.subtext}
                size={gridItemWidth}
                radius={14}
                onPress={() =>
                  navigation.navigate('externalAlbumView', {
                    album: item.title,
                    artist: item.artist,
                  })
                }
              />
            )
          }
        />
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
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  skeletonLight: {
    backgroundColor: '#E5E5EA',
  },
  skeletonDark: {
    backgroundColor: '#1C1C1E',
  },
});