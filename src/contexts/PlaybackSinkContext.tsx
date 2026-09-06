import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TrackPlayer from '@rntp/player';

import { useApi } from '@/api';
import type { JukeboxState } from '@/api/types';
import { useCast } from './CastContext';
import type { DiscoveredDevice } from '@/hooks/useDlnaDiscovery';
import {
  LOCAL_SINK,
  ownsPlayback,
  type PlaybackSink,
} from '@/features/player/playbackSink';

/** How often the jukebox is asked where it is. The server owns the clock when
 *  it owns the audio, and a second is what the local progress hook ticks at,
 *  so the progress bar moves at the same rate either way. */
const JUKEBOX_POLL_MS = 1000;

type SinkContextValue = {
  sink: PlaybackSink;
  isSwitching: boolean;

  selectLocal(): Promise<void>;
  selectDlna(device: DiscoveredDevice): Promise<void>;
  selectJukebox(name: string): Promise<void>;

  /**
   * Transport, routed to whatever is holding the audio. A mirroring sink
   * (DLNA) expects the caller to have driven the local player too; a
   * replacing sink (jukebox) expects the caller not to have.
   */
  sinkPause(): Promise<void>;
  sinkResume(): Promise<void>;
  sinkSeek(positionSeconds: number): Promise<void>;
  /** Hand the sink a whole queue and start it at `index`. Local sinks ignore. */
  sinkLoadQueue(songIds: string[], index: number, play: boolean): Promise<void>;
  sinkSkipTo(index: number): Promise<void>;

  /** Position/duration the sink reports, when it is the one keeping time. */
  jukeboxState: JukeboxState | null;
};

const noop = async () => {};

const PlaybackSinkContext = createContext<SinkContextValue>({
  sink: LOCAL_SINK,
  isSwitching: false,
  selectLocal: noop,
  selectDlna: noop,
  selectJukebox: noop,
  sinkPause: noop,
  sinkResume: noop,
  sinkSeek: noop,
  sinkLoadQueue: noop,
  sinkSkipTo: noop,
  jukeboxState: null,
});

export const usePlaybackSink = () => useContext(PlaybackSinkContext);

/**
 * Which output is selected, and where transport commands go.
 *
 * This exists because "is something casting?" was being asked four different
 * ways: `if (activeDevice) castPause()` in the player, a three-term negation
 * in the output sheet to decide whether "This device" was the selected row,
 * and a fifth copy would have arrived with every new output. One selected
 * sink answers all of them, and `ownsPlayback` says whether the local player
 * should be driven alongside it or left alone entirely.
 */
export function PlaybackSinkProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { connectToDevice, disconnectDevice, castPause, castResume, castSeek } = useCast();

  const [sink, setSink] = useState<PlaybackSink>(LOCAL_SINK);
  const [isSwitching, setIsSwitching] = useState(false);
  const [jukeboxState, setJukeboxState] = useState<JukeboxState | null>(null);

  const sinkRef = useRef<PlaybackSink>(sink);
  useEffect(() => { sinkRef.current = sink; }, [sink]);

  // A server switch takes its jukebox with it: the new server's adapter may
  // not have one, and the queue ids certainly don't carry over.
  useEffect(() => {
    if (sinkRef.current.kind === 'jukebox' && !api.jukebox) {
      setSink(LOCAL_SINK);
      setJukeboxState(null);
    }
  }, [api]);

  // The server keeps the clock while it keeps the audio, so ask it. Only while
  // the jukebox is the selected sink — no polling for a feature nobody chose.
  useEffect(() => {
    if (sink.kind !== 'jukebox' || !api.jukebox) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await api.jukebox!.status();
        if (!cancelled) setJukeboxState(next);
      } catch {
        // A dropped poll is not worth a toast; the next one is a second away.
      }
    };
    void tick();
    const timer = setInterval(tick, JUKEBOX_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [sink, api]);

  const selectLocal = useCallback(async () => {
    const previous = sinkRef.current;
    if (previous.kind === 'local') return;
    setIsSwitching(true);
    try {
      if (previous.kind === 'dlna') {
        await disconnectDevice();
      }
      if (previous.kind === 'jukebox') {
        // Leave the server quiet rather than playing to an empty room.
        await api.jukebox?.stop().catch(() => {});
        setJukeboxState(null);
      }
      setSink(LOCAL_SINK);
    } finally {
      setIsSwitching(false);
    }
  }, [api, disconnectDevice]);

  const selectDlna = useCallback(async (device: DiscoveredDevice) => {
    setIsSwitching(true);
    try {
      if (sinkRef.current.kind === 'jukebox') {
        await api.jukebox?.stop().catch(() => {});
        setJukeboxState(null);
      }
      await connectToDevice(device);
      setSink({ kind: 'dlna', id: device.udn, name: device.name });
    } finally {
      setIsSwitching(false);
    }
  }, [api, connectToDevice]);

  const selectJukebox = useCallback(async (name: string) => {
    if (!api.jukebox) return;
    setIsSwitching(true);
    try {
      if (sinkRef.current.kind === 'dlna') await disconnectDevice();
      // Nothing streams to the phone while the server plays — stop the local
      // player outright rather than muting it the way the DLNA path does.
      TrackPlayer.pause();
      setSink({ kind: 'jukebox', name });
      setJukeboxState(await api.jukebox.status());
    } finally {
      setIsSwitching(false);
    }
  }, [api, disconnectDevice]);

  const sinkPause = useCallback(async () => {
    const current = sinkRef.current;
    if (current.kind === 'dlna') return castPause();
    if (current.kind === 'jukebox') {
      const next = await api.jukebox?.stop();
      if (next) setJukeboxState(next);
    }
  }, [api, castPause]);

  const sinkResume = useCallback(async () => {
    const current = sinkRef.current;
    if (current.kind === 'dlna') return castResume();
    if (current.kind === 'jukebox') {
      const next = await api.jukebox?.start();
      if (next) setJukeboxState(next);
    }
  }, [api, castResume]);

  const sinkSeek = useCallback(async (positionSeconds: number) => {
    const current = sinkRef.current;
    if (current.kind === 'dlna') return castSeek(positionSeconds);
    if (current.kind === 'jukebox') {
      const index = jukeboxState?.currentIndex ?? 0;
      const next = await api.jukebox?.skip(index, positionSeconds);
      if (next) setJukeboxState(next);
    }
  }, [api, castSeek, jukeboxState]);

  const sinkLoadQueue = useCallback(async (songIds: string[], index: number, play: boolean) => {
    if (sinkRef.current.kind !== 'jukebox' || !api.jukebox) return;
    await api.jukebox.setPlaylist(songIds);
    const next = index > 0
      ? await api.jukebox.skip(index)
      : await api.jukebox.status();
    setJukeboxState(play ? await api.jukebox.start() : next);
  }, [api]);

  const sinkSkipTo = useCallback(async (index: number) => {
    if (sinkRef.current.kind !== 'jukebox' || !api.jukebox) return;
    setJukeboxState(await api.jukebox.skip(index));
  }, [api]);

  const value = useMemo<SinkContextValue>(() => ({
    sink,
    isSwitching,
    selectLocal,
    selectDlna,
    selectJukebox,
    sinkPause,
    sinkResume,
    sinkSeek,
    sinkLoadQueue,
    sinkSkipTo,
    jukeboxState: ownsPlayback(sink) ? jukeboxState : null,
  }), [
    sink, isSwitching, selectLocal, selectDlna, selectJukebox,
    sinkPause, sinkResume, sinkSeek, sinkLoadQueue, sinkSkipTo, jukeboxState,
  ]);

  return (
    <PlaybackSinkContext.Provider value={value}>
      {children}
    </PlaybackSinkContext.Provider>
  );
}
