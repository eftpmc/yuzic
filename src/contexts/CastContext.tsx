import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event } from '@rntp/player';
import GoogleCast, {
  useDevices,
  useCastSession,
  useRemoteMediaClient,
  MediaStreamType,
} from 'react-native-google-cast';
import type Device from 'react-native-google-cast/lib/typescript/types/Device';

// ─── DLNA ────────────────────────────────────────────────────────────────────

export interface DlnaDevice {
  name: string;
  udn: string;
  avTransportUrl: string;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// fetch() normalizes header names to lowercase, which breaks LG and other devices
// that do case-sensitive SOAP header matching. XMLHttpRequest preserves exact casing.
function soapAction(url: string, service: string, action: string, body: string): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'text/xml');
    xhr.setRequestHeader('SOAPAction', `"urn:schemas-upnp-org:service:${service}:1#${action}"`);
    xhr.onload = () => {
      const responseText = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: () => Promise.resolve(responseText),
      });
    };
    xhr.onerror = () => reject(new Error('SOAP network error'));
    xhr.ontimeout = () => reject(new Error('SOAP timeout'));
    xhr.timeout = 8000;
    xhr.send(`<?xml version="1.0"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action} xmlns:u="urn:schemas-upnp-org:service:${service}:1">${body}</u:${action}></s:Body></s:Envelope>`);
  });
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface CastContextType {
  // DLNA
  activeDevice: DlnaDevice | null;
  isConnecting: boolean;
  connectToDevice(device: DlnaDevice): Promise<void>;
  disconnectDevice(): Promise<void>;

  // Google Cast
  googleCastDevices: Device[];
  isGoogleCastConnected: boolean;
  isGoogleCastConnecting: boolean;
  connectToGoogleCast(deviceId: string): Promise<void>;
  disconnectGoogleCast(): Promise<void>;

  // Shared controls (routed to whichever protocol is active)
  castPause(): Promise<void>;
  castResume(): Promise<void>;
  castSeek(position: number): Promise<void>;
}

const CastContext = createContext<CastContextType>({
  activeDevice: null,
  isConnecting: false,
  connectToDevice: async () => {},
  disconnectDevice: async () => {},
  googleCastDevices: [],
  isGoogleCastConnected: false,
  isGoogleCastConnecting: false,
  connectToGoogleCast: async () => {},
  disconnectGoogleCast: async () => {},
  castPause: async () => {},
  castResume: async () => {},
  castSeek: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CastProvider({ children }: { children: React.ReactNode }) {
  // DLNA state
  const [activeDevice, setActiveDevice] = useState<DlnaDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const activeDeviceRef = useRef<DlnaDevice | null>(null);
  useEffect(() => { activeDeviceRef.current = activeDevice; }, [activeDevice]);

  // Google Cast hooks (SDK-managed)
  const castSession = useCastSession();
  const remoteMediaClient = useRemoteMediaClient();
  const googleCastDevices = useDevices();
  const [isGoogleCastConnecting, setIsGoogleCastConnecting] = useState(false);
  const isGoogleCastConnected = castSession != null;

  // Stable refs for use inside effects
  const castSessionRef = useRef(castSession);
  const remoteMediaClientRef = useRef(remoteMediaClient);
  useEffect(() => { castSessionRef.current = castSession; }, [castSession]);
  useEffect(() => { remoteMediaClientRef.current = remoteMediaClient; }, [remoteMediaClient]);

  // When track changes, push new URL to whichever renderer is active
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.MediaItemTransition, async (event) => {
      if (!event.item?.url) return;
      const url = event.item.url as string;

      // Google Cast
      if (remoteMediaClientRef.current && castSessionRef.current) {
        try {
          await remoteMediaClientRef.current.loadMedia({
            autoplay: true,
            mediaInfo: {
              contentUrl: url,
              contentType: 'audio/mpeg',
              streamType: MediaStreamType.BUFFERED,
              metadata: {
                type: 'musicTrack',
                title: event.item.title ?? '',
                artist: event.item.artist ?? '',
              },
            },
          });
        } catch (err) {
          console.warn('[Cast] Google Cast track update failed', err);
        }
        return;
      }

      // DLNA
      const device = activeDeviceRef.current;
      if (!device) return;
      try {
        await soapAction(device.avTransportUrl, 'AVTransport', 'SetAVTransportURI',
          `<InstanceID>0</InstanceID><CurrentURI>${xmlEscape(url)}</CurrentURI><CurrentURIMetaData></CurrentURIMetaData>`
        );
        await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
          <InstanceID>0</InstanceID>
          <Speed>1</Speed>
        `);
      } catch (err) {
        console.warn('[Cast] DLNA track update failed', err);
      }
    });
    return () => sub.remove();
  }, []);

  // ── DLNA connect/disconnect ──────────────────────────────────────────────

  const connectToDevice = useCallback(async (device: DlnaDevice) => {
    setIsConnecting(true);
    try {
      const currentTrack = TrackPlayer.getActiveMediaItem();
      if (!currentTrack?.url) throw new Error('No active track to cast');

      const uriRes = await soapAction(device.avTransportUrl, 'AVTransport', 'SetAVTransportURI',
        `<InstanceID>0</InstanceID><CurrentURI>${xmlEscape(currentTrack.url as string)}</CurrentURI><CurrentURIMetaData></CurrentURIMetaData>`
      );
      if (!uriRes.ok) {
        const body = await uriRes.text();
        console.warn('[Cast] SetAVTransportURI failed', uriRes.status, body);
        throw new Error(`SetAVTransportURI ${uriRes.status}`);
      }

      const playRes = await soapAction(device.avTransportUrl, 'AVTransport', 'Play',
        `<InstanceID>0</InstanceID><Speed>1</Speed>`
      );
      if (!playRes.ok) {
        const body = await playRes.text();
        console.warn('[Cast] Play failed', playRes.status, body);
        throw new Error(`Play ${playRes.status}`);
      }

      await TrackPlayer.setVolume(0);
      setActiveDevice(device);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectDevice = useCallback(async () => {
    const device = activeDeviceRef.current;
    if (device) {
      try {
        await soapAction(device.avTransportUrl, 'AVTransport', 'Stop', `<InstanceID>0</InstanceID>`);
      } catch (err) {
        console.warn('[Cast] DLNA stop on disconnect failed', err);
      }
    }
    await TrackPlayer.setVolume(1);
    setActiveDevice(null);
  }, []);

  // ── Google Cast connect/disconnect ──────────────────────────────────────

  const connectToGoogleCast = useCallback(async (deviceId: string) => {
    setIsGoogleCastConnecting(true);
    try {
      const started = await GoogleCast.getSessionManager().startSession(deviceId);
      if (!started) throw new Error('Failed to start Cast session');

      const currentTrack = TrackPlayer.getActiveMediaItem();
      if (currentTrack?.url && remoteMediaClientRef.current) {
        await remoteMediaClientRef.current.loadMedia({
          autoplay: true,
          mediaInfo: {
            contentUrl: currentTrack.url as string,
            contentType: 'audio/mpeg',
            streamType: MediaStreamType.BUFFERED,
            metadata: {
              type: 'musicTrack',
              title: currentTrack.title ?? '',
              artist: currentTrack.artist ?? '',
            },
          },
        });
      }
      await TrackPlayer.setVolume(0);
    } finally {
      setIsGoogleCastConnecting(false);
    }
  }, []);

  const disconnectGoogleCast = useCallback(async () => {
    try {
      await GoogleCast.getSessionManager().endCurrentSession(true);
    } catch (err) {
      console.warn('[Cast] Google Cast disconnect failed', err);
    }
    await TrackPlayer.setVolume(1);
  }, []);

  // ── Shared controls ──────────────────────────────────────────────────────

  const castPause = useCallback(async () => {
    if (remoteMediaClientRef.current && castSessionRef.current) {
      await remoteMediaClientRef.current.pause();
      return;
    }
    const device = activeDeviceRef.current;
    if (!device) return;
    await soapAction(device.avTransportUrl, 'AVTransport', 'Pause', `<InstanceID>0</InstanceID>`);
  }, []);

  const castResume = useCallback(async () => {
    if (remoteMediaClientRef.current && castSessionRef.current) {
      await remoteMediaClientRef.current.play();
      return;
    }
    const device = activeDeviceRef.current;
    if (!device) return;
    await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    `);
  }, []);

  const castSeek = useCallback(async (position: number) => {
    if (remoteMediaClientRef.current && castSessionRef.current) {
      await remoteMediaClientRef.current.seek({ position });
      return;
    }
    const device = activeDeviceRef.current;
    if (!device) return;
    const h = Math.floor(position / 3600);
    const m = Math.floor((position % 3600) / 60);
    const s = Math.floor(position % 60);
    const ts = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    await soapAction(device.avTransportUrl, 'AVTransport', 'Seek', `
      <InstanceID>0</InstanceID>
      <Unit>REL_TIME</Unit>
      <Target>${ts}</Target>
    `);
  }, []);

  return (
    <CastContext.Provider value={{
      activeDevice, isConnecting, connectToDevice, disconnectDevice,
      googleCastDevices, isGoogleCastConnected, isGoogleCastConnecting,
      connectToGoogleCast, disconnectGoogleCast,
      castPause, castResume, castSeek,
    }}>
      {children}
    </CastContext.Provider>
  );
}

export const useCast = () => useContext(CastContext);
