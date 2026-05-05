import { useRef, type RefObject } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

export function useSheetRef(): RefObject<BottomSheetModal> {
  return useRef<BottomSheetModal>(null) as unknown as RefObject<BottomSheetModal>;
}
