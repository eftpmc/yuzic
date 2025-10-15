import React, { useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConfirmActionSheetProps = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  themeColor: string;
};

const ConfirmActionSheet = forwardRef<BottomSheetModal, ConfirmActionSheetProps>(
  ({ title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, themeColor }, ref) => {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const isDark = colorScheme === 'dark';

    return (
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: isDark ? '#111' : '#fff' }}
        handleIndicatorStyle={{ backgroundColor: isDark ? '#555' : '#ccc' }}
      >
      <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
          <Text style={[styles.description, isDark && styles.descriptionDark]}>{description}</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
            >
              <Text style={[styles.cancelText, isDark && styles.cancelTextDark]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.confirmButton, { backgroundColor: themeColor }]}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default ConfirmActionSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  titleDark: {
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  descriptionDark: {
    color: '#aaa',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  cancelButtonDark: {
    backgroundColor: '#222',
  },
  cancelText: {
    fontWeight: '500',
    color: '#444',
  },
  cancelTextDark: {
    color: '#ccc',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  confirmText: {
    fontWeight: '600',
    color: '#fff',
  },
});