import React, { forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { LyricsResult } from '@/api/types';
import Lyrics from './Lyrics';
import { useTheme } from '@/hooks/useTheme';
import { ChevronDown } from 'lucide-react-native';

type LyricsBottomSheetProps = {
  lyrics: LyricsResult | null;
  onClose: () => void;
};

const LyricsBottomSheet = forwardRef<BottomSheetModal, LyricsBottomSheetProps>(
  ({ lyrics, onClose }, ref) => {
    const { isDarkMode } = useTheme();
    const { width } = Dimensions.get('window');
    const layoutWidth = width - 40;

    if (!lyrics) return null;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['90%']}
        enableDynamicSizing={false}
        onDismiss={onClose}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#1c1c1e' : '#fff',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#666' : '#ccc',
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ChevronDown size={28} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            Lyrics
          </Text>
        </View>
        <BottomSheetView style={styles.content}>
          <Lyrics
            lyrics={lyrics}
            width={layoutWidth}
            scrollEnabled
            embedded
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

LyricsBottomSheet.displayName = 'LyricsBottomSheet';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  titleDark: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});

export default LyricsBottomSheet;
