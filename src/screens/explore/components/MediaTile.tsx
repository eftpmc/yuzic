import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
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

function MediaTile({ cover, title, subtitle, size, radius, onPress }: Props) {
  const { isDarkMode } = useTheme();

  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  const containerStyle: StyleProp<ViewStyle> = {
    width: size,
  };

  const imageStyle: StyleProp<ViewStyle> = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
  };

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : undefined}
      style={containerStyle}
    >
      <MediaImage
        cover={cover}
        size="grid"
        style={imageStyle}
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

export default memo(MediaTile);

const styles = StyleSheet.create({
  title: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  subtitleDark: {
    color: '#aaa',
  },
});
