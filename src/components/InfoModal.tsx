import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';

export type InfoRow = {
  id: string;
  label: string;
  value?: string | number;
};

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  cover?: CoverSource;
  rows: InfoRow[];
}

const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  cover,
  rows,
}) => {
  const { isDarkMode } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.975)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.975);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <BlurView
            intensity={isDarkMode ? 140 : 100}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.card}
          >
            <View style={styles.headerRow}>
              {cover && (
                <MediaImage
                  cover={cover}
                  size="grid"
                  style={styles.cover}
                />
              )}

              <View style={styles.headerText}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.title,
                    isDarkMode && styles.titleDark,
                  ]}
                >
                  {title}
                </Text>

                {subtitle && (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subtitle,
                      isDarkMode && styles.subtitleDark,
                    ]}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[
                styles.divider,
                isDarkMode && styles.dividerDark,
              ]}
            />

            {rows.map(row => (
              <View key={row.id} style={styles.row}>
                <Text
                  style={[
                    styles.label,
                    isDarkMode && styles.labelDark,
                  ]}
                >
                  {row.label}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.value,
                    isDarkMode && styles.valueDark,
                  ]}
                >
                  {row.value ?? '—'}
                </Text>
              </View>
            ))}

            <View
              style={[
                styles.divider,
                isDarkMode && styles.dividerDark,
              ]}
            />

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closePressed,
              ]}
            >
              <Ionicons
                name="close"
                size={19}
                style={[
                  styles.icon,
                  isDarkMode && styles.iconDark,
                ]}
              />
              <Text
                style={[
                  styles.closeText,
                  isDarkMode && styles.closeTextDark,
                ]}
              >
                Close
              </Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default InfoModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    padding: 24,
  },

  cardWrapper: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },

  card: {
    minWidth: 320,
    maxWidth: 440,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },

  cover: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 14,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },

  titleDark: {
    color: '#f2f2f2',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },

  subtitleDark: {
    color: '#aaa',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  dividerDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  label: {
    fontSize: 14,
    color: '#555',
  },

  labelDark: {
    color: '#aaa',
  },

  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },

  valueDark: {
    color: '#f2f2f2',
  },

  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  closePressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  icon: {
    marginRight: 14,
    color: '#111',
  },

  iconDark: {
    color: '#f2f2f2',
  },

  closeText: {
    fontSize: 16,
    color: '#111',
  },

  closeTextDark: {
    color: '#f2f2f2',
  },
});