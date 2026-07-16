import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event } from '@rntp/player';

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

  // When track changes, push new URL to the active renderer.
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.MediaItemTransition, async (event) => {
      if (!event.item?.url) return;
      const url = event.item.url as string;

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

  // ── Shared controls ──────────────────────────────────────────────────────

  const castPause = useCallback(async () => {
    const device = activeDeviceRef.current;
    if (!device) return;
    try {
      await soapAction(device.avTransportUrl, 'AVTransport', 'Pause', `<InstanceID>0</InstanceID>`);
    } catch (err) {
      console.warn('[Cast] DLNA pause failed', err);
    }
  }, []);

  const castResume = useCallback(async () => {
    const device = activeDeviceRef.current;
    if (!device) return;
    try {
      await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
        <InstanceID>0</InstanceID>
        <Speed>1</Speed>
      `);
    } catch (err) {
      console.warn('[Cast] DLNA resume failed', err);
    }
  }, []);

  const castSeek = useCallback(async (position: number) => {
    const device = activeDeviceRef.current;
    if (!device) return;
    const h = Math.floor(position / 3600);
    const m = Math.floor((position % 3600) / 60);
    const s = Math.floor(position % 60);
    const ts = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    try {
      await soapAction(device.avTransportUrl, 'AVTransport', 'Seek', `
        <InstanceID>0</InstanceID>
        <Unit>REL_TIME</Unit>
        <Target>${ts}</Target>
      `);
    } catch (err) {
      console.warn('[Cast] DLNA seek failed', err);
    }
  }, []);

  return (
    <CastContext.Provider value={{
      activeDevice, isConnecting, connectToDevice, disconnectDevice,
      castPause, castResume, castSeek,
    }}>
      {children}
    </CastContext.Provider>
  );
}

export const useCast = () => useContext(CastContext);
