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

const CARD_HEIGHT = 280;
const TEXT_AREA_MIN_HEIGHT = 70;
const PADDING = 16;
type Props = {
  artistName: string;
  artistCover: CoverSource | null;
  subtext?: string;
  contentWidth: number;
  onPress?: () => void;
};

export default function AboutTheArtistCard({
  artistName,
  artistCover,
  subtext = 'Artist',
  contentWidth,
  onPress,
}: Props) {
  const imageHeight = CARD_HEIGHT - TEXT_AREA_MIN_HEIGHT;
  const imageUri = artistCover
    ? buildCover(artistCover, 'detail')
    : null;

  const card = (
    <View
      style={[styles.card, { width: contentWidth, height: CARD_HEIGHT }]}
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
          style={styles.title}
          numberOfLines={1}
        >
          {artistName}
        </Text>
        <Text
          style={styles.subtext}
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
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
    backgroundColor: '#1a1a1a',
  },
  textContainer: {
    justifyContent: 'center',
    minHeight: TEXT_AREA_MIN_HEIGHT,
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});
