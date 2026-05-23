import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { toast } from '@backpackapp-io/react-native-toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ExternalSourcePickerSheet, { type PickerItem } from '@/components/ExternalSourcePickerSheet';
import { useEnabledExternalSources, type SourceResolvedAlbum, type SourceResolvedArtist } from './registry';
import { useLibrary } from '@/contexts/LibraryContext';
import { useArtists } from '@/hooks/artists';
import { normalize } from '@/utils/normalize';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

const NO_SOURCE_TOAST = 'Enable an external source in Settings to browse this content.';

type ResolutionOptions = { skipLocalMatch?: boolean };

type ResolutionContextType = {
  resolveAndNavigateToAlbum: (item: ExternalAlbumBase, options?: ResolutionOptions) => void;
  resolveAndNavigateToArtist: (item: ExternalArtistBase, options?: ResolutionOptions) => void;
};

const ExternalResolutionContext = createContext<ResolutionContextType | null>(null);

export function useExternalResolution(): ResolutionContextType {
  const ctx = useContext(ExternalResolutionContext);
  if (!ctx) throw new Error('useExternalResolution must be used within ExternalResolutionProvider');
  return ctx;
}

export function ExternalResolutionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const enabledSources = useEnabledExternalSources();
  const { albums } = useLibrary();
  const { artists } = useArtists();

  const albumPickerRef = useRef<BottomSheetModal>(null);
  const artistPickerRef = useRef<BottomSheetModal>(null);
  const [albumPickerItems, setAlbumPickerItems] = useState<PickerItem[]>([]);
  const [artistPickerItems, setArtistPickerItems] = useState<PickerItem[]>([]);

  const resolveAndNavigateToAlbum = useCallback(async (item: ExternalAlbumBase) => {
    // Library match
    const normTitle = normalize(item.title);
    const normArtist = normalize(item.artist);
    const localMatch = albums.find(a =>
      (item.id && a.mbid && a.mbid === item.id) ||
      (normalize(a.title) === normTitle && normalize(a.artist.name) === normArtist)
    );
    if (localMatch) {
      router.push({ pathname: '/(home)/albumView', params: { id: localMatch.id } });
      return;
    }

    if (enabledSources.length === 0) {
      toast.error(NO_SOURCE_TOAST);
      return;
    }

    // If only one source enabled and it matches the item's source, navigate directly
    if (enabledSources.length === 1 && (!item.externalSource || enabledSources[0].id === item.externalSource)) {
      router.push({ pathname: '/(home)/externalAlbumView', params: { source: item.externalSource ?? enabledSources[0].id, albumId: item.id } });
      return;
    }

    // Resolve across all enabled sources
    const results = (await Promise.all(
      enabledSources.map(s => s.resolveAlbum(item.artist, item.title).catch(() => null))
    )).filter(Boolean) as SourceResolvedAlbum[];

    if (results.length === 0) {
      toast.error('This album could not be found on any enabled source.');
      return;
    }
    if (results.length === 1) {
      router.push({ pathname: '/(home)/externalAlbumView', params: { source: results[0].source, albumId: results[0].id } });
      return;
    }
    setAlbumPickerItems(results.map(r => ({ ...r, kind: 'album' as const })));
    albumPickerRef.current?.present();
  }, [albums, enabledSources, router]);

  const resolveAndNavigateToArtist = useCallback(async (item: ExternalArtistBase, options?: ResolutionOptions) => {
    // Library match — skip when the caller explicitly wants an external view
    if (!options?.skipLocalMatch) {
      const normName = normalize(item.name);
      const localMatch = artists.find(a =>
        (item.externalIds?.mbid && a.mbid && a.mbid === item.externalIds.mbid) ||
        normalize(a.name) === normName
      );
      if (localMatch) {
        router.push({ pathname: '/(home)/artistView', params: { id: localMatch.id } });
        return;
      }
    }

    if (enabledSources.length === 0) {
      toast.error(NO_SOURCE_TOAST);
      return;
    }

    if (enabledSources.length === 1 && (!item.externalSource || enabledSources[0].id === item.externalSource)) {
      router.push({ pathname: '/(home)/externalArtistView', params: { source: item.externalSource ?? enabledSources[0].id, artistId: item.externalIds?.deezerId, mbid: item.externalIds?.mbid ?? item.id, name: item.name } });
      return;
    }

    const results = (await Promise.all(
      enabledSources.map(s => s.resolveArtist(item.name).catch(() => null))
    )).filter(Boolean) as SourceResolvedArtist[];

    if (results.length === 0) {
      toast.error('This artist could not be found on any enabled source.');
      return;
    }
    if (results.length === 1) {
      router.push({ pathname: '/(home)/externalArtistView', params: { source: results[0].source, artistId: results[0].id, name: results[0].name } });
      return;
    }
    setArtistPickerItems(results.map(r => ({ ...r, kind: 'artist' as const })));
    artistPickerRef.current?.present();
  }, [artists, enabledSources, router]);

  return (
    <ExternalResolutionContext.Provider value={{ resolveAndNavigateToAlbum, resolveAndNavigateToArtist }}>
      {children}
      <ExternalSourcePickerSheet
        ref={albumPickerRef}
        items={albumPickerItems}
        onSelect={item => {
          albumPickerRef.current?.dismiss();
          router.push({ pathname: '/(home)/externalAlbumView', params: { source: item.source, albumId: item.id } });
        }}
      />
      <ExternalSourcePickerSheet
        ref={artistPickerRef}
        items={artistPickerItems}
        onSelect={item => {
          artistPickerRef.current?.dismiss();
          const artistName = item.kind === 'artist' ? item.name : '';
          router.push({ pathname: '/(home)/externalArtistView', params: { source: item.source, artistId: item.id, name: artistName } });
        }}
      />
    </ExternalResolutionContext.Provider>
  );
}
