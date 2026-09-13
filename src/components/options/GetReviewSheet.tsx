import { iconSize, spacing, stateLayer, typography } from '@/constants/design';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { notify } from '@/components/toast';
import { useSelector, useDispatch } from 'react-redux';

import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { useTranslation } from 'react-i18next';
import {
  downloadErrorKey,
  useDownloaderStates,
  type DownloaderId,
  type DownloaderState,
} from '@/features/downloaders/registry';
import * as lidarr from '@/api/lidarr';
import type { LidarrQualityProfile } from '@/api/lidarr';
import { setDefaultProvider, setLidarrDefaultQualityProfileId } from '@/utils/redux/slices/downloadersSlice';
import {
  selectDefaultProviderForActiveServer,
  selectLidarrDefaultQualityProfileId,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectActiveServer, selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectIsWanted } from '@/utils/redux/selectors/wantsSelectors';
import { setWantJobRef } from '@/utils/redux/slices/wantsSlice';
import type { ExternalAlbumBase } from '@/types';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetInfoRow,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import Touchable from '@/components/Touchable';

interface Props {
  album: ExternalAlbumBase;
  /** When set, the sheet requests this single track instead of the whole album. */
  track?: { title: string; artist: string };
  sheetRef: React.RefObject<BottomSheetModal>;
}

/**
 * The compact acquisition review. Get always opens this, even when a saved
 * default provider exists for the unit — the confirm tap is what starts a
 * job, never a hidden default. Any provider choice made here is a
 * request-only override unless the user explicitly flips "save as default".
 */
const GetReviewSheet: React.FC<Props> = ({ album, track, sheetRef }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const dispatch = useDispatch();

  const unit: 'album' | 'track' = track ? 'track' : 'album';
  const localId = track ? undefined : album.localId;
  const isWanted = useSelector(localId ? selectIsWanted(localId) : () => false);
  const activeServer = useSelector(selectActiveServer);
  const activeServerId = useSelector(selectActiveServerId);
  const savedDefaults = useSelector(selectDefaultProviderForActiveServer);
  const savedDefaultId = unit === 'album' ? savedDefaults.defaultAlbumProvider : savedDefaults.defaultTrackProvider;
  const savedDefaultQualityProfileId = useSelector(selectLidarrDefaultQualityProfileId);

  const downloaders = useDownloaderStates();
  // A downloader appears only if it takes the unit being asked for: Lidarr has
  // no way to fetch one track, SoulSync no way to take a whole album.
  const available = downloaders.filter(
    (d) => d.isConnected && !!(track ? d.def.downloadTrack : d.def.downloadAlbum)
  );

  // Preselect the saved default only if it's still available for this unit;
  // otherwise leave it unselected — "ask each time".
  const initialSelection = useMemo(
    () => (savedDefaultId && available.some((d) => d.def.id === savedDefaultId) ? savedDefaultId : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the sheet's inputs change, not on every downloader-state tick
    [savedDefaultId, available.map((d) => d.def.id).join(',')]
  );
  const [selectedId, setSelectedId] = useState<DownloaderId | null>(initialSelection);
  // Keep the selection in step with the sheet's target unit/default when it
  // changes underneath an already-mounted sheet (e.g. reused across rows).
  const [lastInitialSelection, setLastInitialSelection] = useState(initialSelection);
  if (initialSelection !== lastInitialSelection) {
    setLastInitialSelection(initialSelection);
    setSelectedId(initialSelection);
  }

  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const sheetBg = useOptionSheetBackground();

  const selected = available.find((d) => d.def.id === selectedId) ?? null;

  // Lidarr's one quality-relevant knob — album-only, since slskd/soulsync
  // have no quality-profile concept. Fetched lazily only once Lidarr is the
  // chosen provider for an album Get, and pre-filled from the saved default;
  // changing it here is request-only unless "save as default" is checked.
  const showQualityProfile = unit === 'album' && selected?.def.id === 'lidarr';
  const [qualityProfiles, setQualityProfiles] = useState<LidarrQualityProfile[]>([]);
  const [qualityProfilesLoading, setQualityProfilesLoading] = useState(false);
  const [selectedQualityProfileId, setSelectedQualityProfileId] = useState<number | undefined>(
    savedDefaultQualityProfileId
  );

  useEffect(() => {
    if (!showQualityProfile || !selected) {
      return;
    }
    setSelectedQualityProfileId(savedDefaultQualityProfileId);
    let cancelled = false;
    setQualityProfilesLoading(true);
    lidarr
      .getQualityProfiles(selected.config)
      .then((profiles) => {
        if (!cancelled) setQualityProfiles(profiles);
      })
      .catch(() => {
        if (!cancelled) setQualityProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setQualityProfilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showQualityProfile, selected, savedDefaultQualityProfileId]);

  const handleGet = async ({ def, config }: DownloaderState) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = track
        ? await def.downloadTrack!(config, { title: track.title, artist: track.artist })
        : await def.downloadAlbum!(
            config,
            album,
            showQualityProfile ? { qualityProfileId: selectedQualityProfileId } : undefined
          );
      const successKey = track ? def.trackAddedKey! : def.albumAddedKey;
      const fallback = t('externalAlbum.download.failed');
      notify[result.success ? 'success' : 'error'](
        result.success
          ? t(successKey)
          : t(downloadErrorKey(def.id, result.code), { defaultValue: fallback })
      );
      if (result.success) {
        // Persist the chosen provider as the unit default only when the user
        // explicitly asked for that — a request-only override never writes here.
        if (saveAsDefault) {
          dispatch(setDefaultProvider({ serverId: activeServerId ?? '', unit, provider: def.id }));
          // Lidarr's quality profile follows the same explicit toggle — a
          // bumped-for-this-Get profile only becomes the new default when the
          // user asked to keep it, same as the provider itself.
          if (showQualityProfile && activeServerId) {
            dispatch(
              setLidarrDefaultQualityProfileId({
                serverId: activeServerId,
                qualityProfileId: selectedQualityProfileId,
              })
            );
          }
        }
        // Wire the started job back to the want, if this entity is wanted —
        // Get never requires a Want, so this is a no-op otherwise.
        if (localId && isWanted && activeServerId) {
          dispatch(setWantJobRef({ serverId: activeServerId, localId, jobRef: `${def.id}:${Date.now()}` }));
        }
        sheetRef.current?.dismiss();
      }
    } catch {
      notify.error(t('externalAlbum.download.startFailed'));
    } finally {
      setLoading(false);
    }
  };

  const headerTitle = track ? track.title : album.title;
  const headerSubtext = track ? track.artist : album.artist;
  const requestingQuery = track
    ? `${track.title} — ${track.artist}`
    : `${album.title} — ${album.artist}${album.externalIds?.mbid ? ` (mbid: ${album.externalIds.mbid})` : ''}`;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose={!loading}
      backdropComponent={renderBackdrop}
      stackBehavior="push"
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
    >
      <BottomSheetScrollView style={sheetBg} contentContainerStyle={styles.content}>
        <OptionSheetHeader cover={album.cover} title={headerTitle} subtitle={headerSubtext} />

        <OptionSheetDivider />

        <OptionSheetInfoRow
          label={t('externalAlbum.review.targetServer')}
          value={activeServer?.serverUrl ?? t('externalAlbum.review.noServer')}
        />

        <OptionSheetDivider />

        <OptionSheetSectionLabel label={t('externalAlbum.download.chooseService')} />

        {available.map((downloader) => {
          const isSelected = selectedId === downloader.def.id;
          return (
            <OptionSheetRow
              key={downloader.def.id}
              label={downloader.def.label}
              description={t(downloader.def.descriptionKey)}
              onPress={() => setSelectedId(downloader.def.id)}
              disabled={loading}
              dimRow={loading}
              labelColor={isSelected ? colors.secondary : undefined}
              trailing={
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.secondary : colors.border, borderRadius: rad.pill },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.secondary, borderRadius: rad.pill },
                      ]}
                    />
                  )}
                </View>
              }
            />
          );
        })}

        {/*
         * Lidarr quality-profile override slot — request-only unless "save
         * as default" is checked below. Only rendered for an album Get with
         * Lidarr selected; slskd/soulsync have no quality-profile concept.
         */}
        {showQualityProfile && (
          <>
            <OptionSheetSectionLabel label={t('externalAlbum.review.qualityProfile')} />
            {qualityProfilesLoading ? (
              <View style={styles.qualityLoading}>
                <SpinningLoaderCircle size={iconSize.row} color={colors.themeColor} />
              </View>
            ) : (
              qualityProfiles.map((profile) => {
                const isProfileSelected = selectedQualityProfileId === profile.id;
                return (
                  <OptionSheetRow
                    key={profile.id}
                    label={profile.name}
                    onPress={() => setSelectedQualityProfileId(profile.id)}
                    disabled={loading}
                    dimRow={loading}
                    labelColor={isProfileSelected ? colors.secondary : undefined}
                    trailing={
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: isProfileSelected ? colors.secondary : colors.border, borderRadius: rad.pill },
                        ]}
                      >
                        {isProfileSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: colors.secondary, borderRadius: rad.pill },
                            ]}
                          />
                        )}
                      </View>
                    }
                  />
                );
              })
            )}
          </>
        )}

        <OptionSheetDivider />

        <View style={styles.requestingRow}>
          <Text style={[styles.requestingLabel, { color: colors.subtext }]}>
            {t('externalAlbum.review.requesting')}
          </Text>
          <Text style={[styles.requestingValue, { color: colors.secondary }]} numberOfLines={2}>
            {requestingQuery}
          </Text>
        </View>

        {selected && (
          <Touchable
            style={styles.saveDefaultRow}
            onPress={() => setSaveAsDefault((v) => !v)}
            disabled={loading}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: colors.border, borderRadius: rad.card },
                saveAsDefault && { backgroundColor: colors.secondary, borderColor: colors.secondary },
              ]}
            />
            <Text style={[styles.saveDefaultLabel, { color: colors.subtext }]}>
              {unit === 'album'
                ? t('externalAlbum.review.saveAsDefaultAlbums')
                : t('externalAlbum.review.saveAsDefaultTracks')}
            </Text>
          </Touchable>
        )}

        <Touchable
          style={[
            styles.getButton,
            { backgroundColor: colors.secondary, borderRadius: rad.card },
            (!selected || loading) && styles.getButtonDisabled,
          ]}
          onPress={() => selected && handleGet(selected)}
          disabled={!selected || loading}
        >
          {loading ? (
            <SpinningLoaderCircle size={iconSize.row} color={colors.background} />
          ) : (
            <Text style={[styles.getButtonLabel, { color: colors.background }]}>
              {t('externalAlbum.review.confirmGet')}
            </Text>
          )}
        </Touchable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

export default GetReviewSheet;

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.generous,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
  },
  qualityLoading: {
    paddingVertical: spacing.roomy,
    alignItems: 'center',
  },
  requestingRow: {
    marginTop: spacing.sm,
  },
  requestingLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginBottom: spacing.xxs,
  },
  requestingValue: {
    ...typography.rowSubtitle,
  },
  saveDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    marginRight: spacing.md,
  },
  saveDefaultLabel: {
    ...typography.rowSubtitle,
  },
  getButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getButtonDisabled: {
    opacity: stateLayer.mutedOpacity,
  },
  getButtonLabel: {
    ...typography.rowTitle,
    fontWeight: '600',
  },
});
