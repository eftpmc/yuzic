import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { FormSheet, FormSheetField } from '@/components/FormSheet';
import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useTheme } from '@/hooks/useTheme';
import { makeLocalId } from '@/types/EntityId';
import type { EntityKind } from '@/types/EntityId';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { addWant } from '@/utils/redux/slices/wantsSlice';

/**
 * Monotonic counter mixed into the manual `localId` so two wants added in
 * the same millisecond (fast double-tap, or a test) never collide — the id
 * only has to be stable *after* creation, not derived from anything about
 * the want itself.
 */
let manualAddCounter = 0;

export type ManualAddWantSheetProps = {
  /** Whether the sheet is currently presented. */
  visible: boolean;
  /** Called once the sheet has finished dismissing, however it closed. */
  onClose: () => void;
};

/**
 * Bottom sheet for adding a Want with nothing resolved on-device: a
 * Track/Album choice plus a title and artist the user types themselves.
 * Per the locked Wants design, a 'manual' origin still saves a full row —
 * title/artist live on the `Want` itself — and does no lookup or network
 * call; the localId only has to be unique and stable once created, since
 * there is no external record to derive it from.
 *
 * Entry point: `useManualAddWantSheet()` below returns `{ open, sheet }` —
 * a screen calls `open()` and renders `sheet` alongside its content. The
 * Wants library screen (Phase C5) is the intended real entry point; until
 * it exists, nothing calls `open()` from product code, but the sheet and
 * hook are fully wired and tested standalone.
 */
export function ManualAddWantSheet({ visible, onClose }: ManualAddWantSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const dispatch = useDispatch();
  const activeServerId = useSelector(selectActiveServerId);

  const [unit, setUnit] = useState<'track' | 'album'>('track');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const canSubmit = title.trim().length > 0 && artist.trim().length > 0 && !!activeServerId;

  const reset = useCallback(() => {
    setUnit('track');
    setTitle('');
    setArtist('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !activeServerId) return false;
    const kind: EntityKind = unit;
    manualAddCounter += 1;
    const localId = makeLocalId({
      kind,
      externalSource: 'manual',
      externalNativeId: `${Date.now()}-${manualAddCounter}`,
    });

    dispatch(addWant({
      serverId: activeServerId,
      want: {
        localId,
        unit,
        title: title.trim(),
        artist: artist.trim(),
        origin: 'manual',
      },
    }));

    return true;
  }, [canSubmit, activeServerId, unit, title, artist, dispatch]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const options = useMemo(
    () => [
      { key: 'track' as const, label: t('manualAddWant.unit.track') },
      { key: 'album' as const, label: t('manualAddWant.unit.album') },
    ],
    [t]
  );

  if (!visible) return null;

  return (
    <FormSheet
      title={t('manualAddWant.title')}
      submitLabel={t('manualAddWant.add')}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      onClose={handleClose}
    >
      <View style={styles.segmented}>
        {options.map(option => {
          const active = option.key === unit;
          return (
            <Touchable
              key={option.key}
              testID={`manual-add-want-unit-${option.key}`}
              onPress={() => setUnit(option.key)}
              style={[
                styles.segment,
                { borderRadius: rad.md, backgroundColor: active ? colors.themeColor : colors.muted },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.onThemeColor : colors.subtext },
                ]}
              >
                {option.label}
              </Text>
            </Touchable>
          );
        })}
      </View>

      <FormSheetField
        label={t('manualAddWant.titleField')}
        value={title}
        onChangeText={setTitle}
        accessibilityLabel={t('manualAddWant.titleField')}
      />
      <FormSheetField
        label={t('manualAddWant.artistField')}
        value={artist}
        onChangeText={setArtist}
        accessibilityLabel={t('manualAddWant.artistField')}
      />
    </FormSheet>
  );
}

/**
 * Owns the sheet's `visible` state so a caller only needs `open()` and to
 * render `sheet` — the same shape `useSheetRef`-based sheets present, but
 * `FormSheet` drives its own imperative ref internally, so state is what's
 * shared here instead.
 */
export function useManualAddWantSheet() {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const sheet = <ManualAddWantSheet visible={visible} onClose={close} />;

  return { open, sheet };
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    height: iconSize.loader * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    ...typography.button,
  },
});
