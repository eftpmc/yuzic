import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';

export type InternetRadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  homepageUrl?: string;
};

/**
 * User-defined internet radio stations stored on the Subsonic server. Navidrome
 * supports the full CRUD; other Subsonic servers may not, but reading always
 * works when the endpoint is present.
 */
export async function getInternetRadioStations(
  client: NavidromeClient
): Promise<InternetRadioStation[]> {
  try {
    const raw = await client.request<SubsonicResponse>('getInternetRadioStations.view', {});
    const stations = raw?.['subsonic-response']?.internetRadioStations?.internetRadioStation ?? [];
    if (!Array.isArray(stations)) return [];
    return stations
      .filter((s): s is typeof s & { id: string; name: string; streamUrl: string } =>
        !!s?.id && !!s?.name && !!s?.streamUrl
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        streamUrl: s.streamUrl,
        homepageUrl: s.homepageUrl ?? undefined,
      }));
  } catch (error) {
    console.error('Navidrome getInternetRadioStations failed:', error);
    return [];
  }
}

export async function createInternetRadioStation(
  client: NavidromeClient,
  input: { name: string; streamUrl: string; homepageUrl?: string }
): Promise<void> {
  await client.request('createInternetRadioStation.view', {
    name: input.name,
    streamUrl: input.streamUrl,
    ...(input.homepageUrl ? { homepageUrl: input.homepageUrl } : {}),
  });
}

export async function updateInternetRadioStation(
  client: NavidromeClient,
  input: { id: string; name: string; streamUrl: string; homepageUrl?: string }
): Promise<void> {
  await client.request('updateInternetRadioStation.view', {
    id: input.id,
    name: input.name,
    streamUrl: input.streamUrl,
    ...(input.homepageUrl ? { homepageUrl: input.homepageUrl } : {}),
  });
}

export async function deleteInternetRadioStation(
  client: NavidromeClient,
  id: string
): Promise<void> {
  await client.request('deleteInternetRadioStation.view', { id });
}
