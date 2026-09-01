import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import {
  PLAYING_ARTIST_CARD_HEIGHT,
  PLAYING_ARTIST_TEXT_MIN_HEIGHT,
  PLAYING_ARTIST_CARD_PADDING,
} from '@/constants/features';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';
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
  subtext,
  contentWidth,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const imageHeight = PLAYING_ARTIST_CARD_HEIGHT - PLAYING_ARTIST_TEXT_MIN_HEIGHT;
  const imageUri = artistCover
    ? buildCover(artistCover, 'detail')
    : null;

  const card = (
    <View
      style={[styles.card, { width: contentWidth, height: PLAYING_ARTIST_CARD_HEIGHT }]}
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
          {t('playing.aboutArtist.header')}
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
          {subtext ?? t('playing.aboutArtist.subtext')}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Touchable
        onPress={onPress}
        style={styles.touchable}
      >
        {card}
      </Touchable>
    );
  }

  return <View style={styles.touchable}>{card}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    marginTop: spacing.lg,
  },
  card: {
    borderRadius: radius.panel,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  header: {
    ...typography.label,
    position: 'absolute',
    top: PLAYING_ARTIST_CARD_PADDING,
    left: PLAYING_ARTIST_CARD_PADDING,
    right: PLAYING_ARTIST_CARD_PADDING,
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
    minHeight: PLAYING_ARTIST_TEXT_MIN_HEIGHT,
    paddingHorizontal: PLAYING_ARTIST_CARD_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.navigationTitle,
    color: '#fff',
  },
  subtext: {
    ...typography.rowSubtitle,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.xxs,
  },
});
