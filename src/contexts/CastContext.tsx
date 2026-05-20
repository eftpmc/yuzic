import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event } from '@rntp/player';

export interface DlnaDevice {
  name: string;
  udn: string;
  avTransportUrl: string;
}

interface CastContextType {
  activeDevice: DlnaDevice | null;
  isConnecting: boolean;
  connectToDevice(device: DlnaDevice): Promise<void>;
  disconnectDevice(): Promise<void>;
  castPause(): Promise<void>;
  castResume(): Promise<void>;
  castSeek(position: number): Promise<void>;
}

function soapAction(url: string, service: string, action: string, body: string) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      SOAPACTION: `"urn:schemas-upnp-org:service:${service}:1#${action}"`,
    },
    body: `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="urn:schemas-upnp-org:service:${service}:1">
      ${body}
    </u:${action}>
  </s:Body>
</s:Envelope>`,
  });
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

export function CastProvider({ children }: { children: React.ReactNode }) {
  const [activeDevice, setActiveDevice] = useState<DlnaDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const activeDeviceRef = useRef<DlnaDevice | null>(null);

  useEffect(() => { activeDeviceRef.current = activeDevice; }, [activeDevice]);

  // When track changes while casting, push new URL to the renderer
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.MediaItemTransition, async (event) => {
      const device = activeDeviceRef.current;
      if (!device || !event.item?.url) return;
      try {
        await soapAction(device.avTransportUrl, 'AVTransport', 'SetAVTransportURI', `
          <InstanceID>0</InstanceID>
          <CurrentURI>${event.item.url}</CurrentURI>
          <CurrentURIMetaData></CurrentURIMetaData>
        `);
        await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
          <InstanceID>0</InstanceID>
          <Speed>1</Speed>
        `);
      } catch (err) {
        console.warn('[Cast] Track update to renderer failed', err);
      }
    });
    return () => sub.remove();
  }, []);

  const connectToDevice = useCallback(async (device: DlnaDevice) => {
    setIsConnecting(true);
    try {
      const currentTrack = TrackPlayer.getActiveMediaItem();
      if (!currentTrack?.url) throw new Error('No active track to cast');

      await soapAction(device.avTransportUrl, 'AVTransport', 'SetAVTransportURI', `
        <InstanceID>0</InstanceID>
        <CurrentURI>${currentTrack.url}</CurrentURI>
        <CurrentURIMetaData></CurrentURIMetaData>
      `);
      await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
        <InstanceID>0</InstanceID>
        <Speed>1</Speed>
      `);
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
        console.warn('[Cast] Stop on disconnect failed', err);
      }
    }
    await TrackPlayer.setVolume(1);
    setActiveDevice(null);
  }, []);

  const castPause = useCallback(async () => {
    const device = activeDeviceRef.current;
    if (!device) return;
    await soapAction(device.avTransportUrl, 'AVTransport', 'Pause', `<InstanceID>0</InstanceID>`);
  }, []);

  const castResume = useCallback(async () => {
    const device = activeDeviceRef.current;
    if (!device) return;
    await soapAction(device.avTransportUrl, 'AVTransport', 'Play', `
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    `);
  }, []);

  const castSeek = useCallback(async (position: number) => {
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
    <CastContext.Provider value={{ activeDevice, isConnecting, connectToDevice, disconnectDevice, castPause, castResume, castSeek }}>
      {children}
    </CastContext.Provider>
  );
}

export const useCast = () => useContext(CastContext);
