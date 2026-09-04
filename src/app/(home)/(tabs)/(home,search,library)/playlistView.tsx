import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import PlaylistView from "@/screens/playlist";
import { useSync } from '@/hooks/useSync';

export default function PlaylistScreen() {
  const { syncPlaylists } = useSync()
  useFocusEffect(useCallback(() => { syncPlaylists() }, [syncPlaylists]))

  return <PlaylistView />;
}
