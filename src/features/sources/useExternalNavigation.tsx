import React, { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ExternalSourcePickerSheet, { type PickerItem } from '@/components/ExternalSourcePickerSheet';
import { useEnabledExternalSources, type SourceResolvedAlbum, type SourceResolvedArtist } from './registry';

export function useExternalNavigation({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const enabledSources = useEnabledExternalSources();

  const [isResolving, setIsResolving] = useState(false);
  const [albumPickerItems, setAlbumPickerItems] = useState<PickerItem[]>([]);
  const [albumPickerTitle, setAlbumPickerTitle] = useState('');
  const [artistPickerItems, setArtistPickerItems] = useState<PickerItem[]>([]);
  const [artistPickerTitle, setArtistPickerTitle] = useState('');
  const albumPickerRef = useRef<BottomSheetModal>(null);
  const artistPickerRef = useRef<BottomSheetModal>(null);

  const navigateToExternalAlbum = async (
    artistName: string,
    albumTitle: string,
    pickerTitle?: string,
  ) => {
    if (!enabledSources.length) return;
    setIsResolving(true);
    try {
      const results = (await Promise.all(
        enabledSources.map(s => s.resolveAlbum(artistName, albumTitle).catch(() => null))
      )).filter(Boolean) as SourceResolvedAlbum[];
      if (results.length === 0) {
        toast.error(t('external.notFound'));
        return;
      }
      if (results.length === 1) {
        onClose();
        navigation.navigate('externalAlbumView', { albumId: results[0].id, source: results[0].source });
        return;
      }
      setAlbumPickerTitle(pickerTitle ?? albumTitle);
      setAlbumPickerItems(results.map(r => ({ ...r, kind: 'album' as const })));
      albumPickerRef.current?.present();
    } finally {
      setIsResolving(false);
    }
  };

  const navigateToExternalArtist = async (
    name: string,
    pickerTitle?: string,
  ) => {
    if (!enabledSources.length) return;
    setIsResolving(true);
    try {
      const results = (await Promise.all(
        enabledSources.map(s => s.resolveArtist(name).catch(() => null))
      )).filter(Boolean) as SourceResolvedArtist[];
      if (results.length === 0) {
        toast.error(t('external.notFound'));
        return;
      }
      if (results.length === 1) {
        onClose();
        navigation.navigate('externalArtistView', { artistId: results[0].id, source: results[0].source });
        return;
      }
      setArtistPickerTitle(pickerTitle ?? name);
      setArtistPickerItems(results.map(r => ({ ...r, kind: 'artist' as const })));
      artistPickerRef.current?.present();
    } finally {
      setIsResolving(false);
    }
  };

  const pickerElement = (
    <>
      <ExternalSourcePickerSheet
        ref={albumPickerRef}
        items={albumPickerItems}
        title={albumPickerTitle}
        onSelect={(item) => {
          albumPickerRef.current?.dismiss();
          onClose();
          navigation.navigate('externalAlbumView', { albumId: item.id, source: item.source });
        }}
      />
      <ExternalSourcePickerSheet
        ref={artistPickerRef}
        items={artistPickerItems}
        title={artistPickerTitle}
        onSelect={(item) => {
          artistPickerRef.current?.dismiss();
          onClose();
          navigation.navigate('externalArtistView', { artistId: item.id, source: item.source });
        }}
      />
    </>
  );

  return {
    isResolving,
    hasExternalSources: enabledSources.length > 0,
    navigateToExternalAlbum,
    navigateToExternalArtist,
    pickerElement,
  };
}
