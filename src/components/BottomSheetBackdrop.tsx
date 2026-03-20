import React from 'react';
import {
  BottomSheetBackdrop as GorhomBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

export const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <GorhomBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    pressBehavior="close"
  />
);
