import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/hooks/useTheme';
import { MediaImage } from '@/components/MediaImage';
import { useGridLayout } from '@/hooks/useGridLayout';
import { useExplore } from '@/contexts/ExploreContext';
import { useNavigation } from '@react-navigation/native';

const H_PADDING = 16;

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

const MediaTile = React.memo(function MediaTile({
  cover,
  title,
  subtitle,
  size,
  radius,
  onPress,
  isDarkMode,
}: {
  cover: any;
  title: string;
  subtitle: string;
  size: number;
  radius: number;
  onPress?: () => void;
  isDarkMode: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} style={{ width: size }}>
      <MediaImage
        cover={cover}
        size="grid"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
        }}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.tileTitle,
          isDarkMode && styles.tileTitleDark,
        ]}
      >
        {title}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.tileSubtitle,
          isDarkMode && styles.tileSubtitleDark,
        ]}
      >
        {subtitle}
      </Text>
    </Wrapper>
  );
});

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
  const { artistPool, albumPool, isLoading } = useExplore();
  const { gridItemWidth, gridGap } = useGridLayout();

  const artistData = artistPool.length
  ? artistPool
  : Array.from({ length: 6 });

const albumData = albumPool.length
  ? albumPool
  : Array.from({ length: 6 });

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
        <FlashList
          horizontal
          data={artistData}
          keyExtractor={(item, index) =>
            item?.id ?? `placeholder-artist-${index}`
          }
          estimatedItemSize={gridItemWidth}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
          }}
          ItemSeparatorComponent={() => (
            <View style={{ width: gridGap }} />
          )}
          renderItem={({ item }) =>
            item?.id ? (
              <MediaTile
                cover={item.cover}
                title={item.name}
                subtitle="Artist"
                size={gridItemWidth}
                radius={gridItemWidth / 2}
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate('artistView', {
                    id: item.id,
                  })
                }
              />
            ) : (
              <PlaceholderTile
                size={gridItemWidth}
                radius={gridItemWidth / 2}
                isDarkMode={isDarkMode}
              />
            )
          }
        />
      </Section>

      <Section title="Albums You Might Like" isDarkMode={isDarkMode}>
        <FlashList
          horizontal
          data={albumData}
          keyExtractor={(item, index) =>
            item?.id ?? `placeholder-album-${index}`
          }
          estimatedItemSize={gridItemWidth}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
          }}
          ItemSeparatorComponent={() => (
            <View style={{ width: gridGap }} />
          )}
          renderItem={({ item }) =>
            item?.title ? (
              <MediaTile
                cover={item.cover}
                title={item.title}
                subtitle={item.subtext}
                size={gridItemWidth}
                radius={12}
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate('externalAlbumView', {
                    album: item.title,
                    artist: item.subtext,
                  })
                }
              />
            ) : (
              <PlaceholderTile
                size={gridItemWidth}
                radius={12}
                isDarkMode={isDarkMode}
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
    paddingTop: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    paddingHorizontal: H_PADDING,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  tileTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  tileTitleDark: {
    color: '#fff',
  },
  tileSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#666',
  },
  tileSubtitleDark: {
    color: '#aaa',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  skeletonLight: {
    backgroundColor: '#E5E5EA',
  },
  skeletonDark: {
    backgroundColor: '#1C1C1E',
  },
});