import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Appearance,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';

export type ContextMenuAction = {
  id: string;
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  destructive?: boolean;
  primary?: boolean;
  dividerBefore?: boolean;
};

interface ContextMenuModalProps {
  visible: boolean;
  onClose: () => void;
  actions: ContextMenuAction[];
}

const ContextMenuModal: React.FC<ContextMenuModalProps> = ({
  visible,
  onClose,
  actions,
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
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        unstable_pressDelay={40}
      >
        <Animated.View
          style={[
            styles.menuWrapper,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <BlurView
            intensity={isDarkMode ? 140 : 100}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.menu}
          >
            {actions.map(action => (
              <View key={action.id}>
                {action.dividerBefore && (
                  <View
                    style={[
                      styles.divider,
                      isDarkMode && styles.dividerDark,
                    ]}
                  />
                )}

                <Pressable
                  onPress={() => {
                    if (action.disabled) return;
                    Haptics.selectionAsync();
                    action.onPress();
                    onClose();
                  }}
                  disabled={action.disabled}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                    action.disabled && styles.menuItemDisabled,
                  ]}
                >
                  {action.icon && (
                    <Ionicons
                      name={action.icon}
                      size={19}
                      style={[
                        styles.icon,
                        isDarkMode && styles.iconDark,
                        action.destructive && styles.iconDestructive,
                      ]}
                    />
                  )}

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuText,
                      isDarkMode && styles.menuTextDark,
                      action.destructive && styles.menuTextDestructive,
                      action.primary && styles.menuTextPrimary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
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
                styles.menuItem,
                pressed && styles.menuItemPressed,
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
                  styles.menuText,
                  isDarkMode && styles.menuTextDark,
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default ContextMenuModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    padding: 22,
  },

  menuWrapper: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },

  menu: {
    minWidth: 300,
    maxWidth: 400,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },

  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  menuItemDisabled: {
    opacity: 0.45,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  dividerDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  icon: {
    marginRight: 14,
    color: '#111',
  },

  iconDark: {
    color: '#f2f2f2',
  },

  iconDestructive: {
    color: '#ff453a',
  },

  menuText: {
    fontSize: 15.5,
    color: '#111',
    flexShrink: 1,
  },

  menuTextDark: {
    color: '#f2f2f2',
  },

  menuTextDestructive: {
    color: '#ff453a',
  },

  menuTextPrimary: {
    fontWeight: '600',
  },
});