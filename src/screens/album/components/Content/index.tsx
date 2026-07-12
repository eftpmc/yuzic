import React from 'react';

import { Album, ExternalAlbum } from '@/types';

import LocalAlbumBody from './LocalAlbumBody';
import ExternalAlbumBody from './ExternalAlbumBody';

type Props = {
  localAlbum: Album | null;
  externalAlbum: ExternalAlbum | null;
  songsLoading?: boolean;
};

// Local and external albums are rendered by two structurally separate list
// bodies (real Songs with full playback vs ExternalSongs with 30s previews) —
// unifying only the identity resolution and Header, per the Artist screen's
// own precedent of not converging preview rows with full-playback rows.
const AlbumContent: React.FC<Props> = ({ localAlbum, externalAlbum, songsLoading }) => {
  if (localAlbum) {
    return <LocalAlbumBody album={localAlbum} songsLoading={songsLoading} />;
  }
  return <ExternalAlbumBody album={externalAlbum!} />;
};

export default AlbumContent;
