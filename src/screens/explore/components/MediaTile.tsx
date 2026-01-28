import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  cover: any;
  title: string;
  subtitle: string;
  size: number;
  radius: number;
  onPress?: () => void;
};

const MediaTile = React.memo(
  ({ cover, title, subtitle, size, radius, onPress }: Props) => {
    const Wrapper = onPress ? TouchableOpacity : View;
    const { isDarkMode } = useTheme();

    return (
      <Wrapper onPress={onPress} style={{ width: size }}>
        <MediaImage
          cover={cover}
          size="thumb"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            overflow: 'hidden',
          }}
        />
        <Text
          numberOfLines={1}
          style={[styles.title, isDarkMode && styles.titleDark]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.subtitle, isDarkMode && styles.subtitleDark]}
        >
          {subtitle}
        </Text>
      </Wrapper>
    );
  }
);

export default MediaTile;

const styles = StyleSheet.create({
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  subtitleDark: {
    color: '#aaa',
  },
});