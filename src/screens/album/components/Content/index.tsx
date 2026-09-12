import React from 'react';

import { Album, ExternalAlbum } from '@/types';

import LocalAlbumBody from './LocalAlbumBody';
import ExternalAlbumBody from './ExternalAlbumBody';

type Props = {
  localAlbum: Album | null;
  externalAlbum: ExternalAlbum | null;
  songsLoading?: boolean;
};

// One album screen, one resolution state: the caller (screens/album/index.tsx)
// has already resolved the album to either a local library entry or an
// external lookup result, and passes exactly one of the two non-null here.
// Which body renders follows directly from that resolution — `localAlbum`
// present means the screen is showing an in-library album with full,
// downloadable Songs; absent means it's showing an external album whose
// tracks only ever resolve to 30s previews. That playback-capability
// difference is real, so the two bodies stay separate components rather than
// being merged into one that branches internally per row.
const AlbumContent: React.FC<Props> = ({ localAlbum, externalAlbum, songsLoading }) => {
  if (localAlbum) {
    return <LocalAlbumBody album={localAlbum} songsLoading={songsLoading} />;
  }
  return <ExternalAlbumBody album={externalAlbum!} />;
};

export default AlbumContent;
