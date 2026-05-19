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
  onLongPress?: () => void;
};

function MediaTile({ cover, title, subtitle, size, radius, onPress, onLongPress }: Props) {
  const { colors } = useTheme();

  const Wrapper: React.ComponentType<any> = onPress || onLongPress ? TouchableOpacity : View;

  const containerStyle: StyleProp<ViewStyle> = { width: size };
  const imageStyle: StyleProp<ViewStyle> = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
  };

  return (
    <Wrapper onPress={onPress} onLongPress={onLongPress} activeOpacity={onPress || onLongPress ? 0.7 : undefined} style={containerStyle}>
      <MediaImage cover={cover} size="grid" style={imageStyle} />
      <Text numberOfLines={1} style={[styles.title, { color: colors.secondary }]}>{title}</Text>
      <Text numberOfLines={1} style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
    </Wrapper>
  );
}

export default memo(MediaTile);

const styles = StyleSheet.create({
  title: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
  },
});
