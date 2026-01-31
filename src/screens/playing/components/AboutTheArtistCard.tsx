import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';

const CARD_HEIGHT = 260;
const IMAGE_RATIO = 0.78;
const PADDING = 16;
type Props = {
  artistName: string;
  artistCover: CoverSource | null;
  subtext?: string;
  contentWidth: number;
  isDarkMode: boolean;
  onPress?: () => void;
};

export default function AboutTheArtistCard({
  artistName,
  artistCover,
  subtext = 'Artist',
  contentWidth,
  isDarkMode,
  onPress,
}: Props) {
  const imageHeight = CARD_HEIGHT * IMAGE_RATIO;
  const imageUri = artistCover
    ? buildCover(artistCover, 'detail')
    : null;

  const card = (
    <View
      style={[
        styles.card,
        { width: contentWidth, height: CARD_HEIGHT },
        isDarkMode && styles.cardDark,
      ]}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={imageUri ? { uri: imageUri } : require('@assets/images/artist-placeholder.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top center"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <Text
          style={styles.header}
          numberOfLines={1}
        >
          Artist
        </Text>
      </View>

      <View style={styles.textContainer}>
        <Text
          style={[styles.title, isDarkMode && styles.titleDark]}
          numberOfLines={1}
        >
          {artistName}
        </Text>
        <Text
          style={[styles.subtext, isDarkMode && styles.subtextDark]}
          numberOfLines={1}
        >
          {subtext}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        {card}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{card}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    marginTop: 16,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    right: PADDING,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'left',
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  textContainer: {
    justifyContent: 'center',
    paddingHorizontal: PADDING,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subtextDark: {
    color: '#aaa',
  },
});
