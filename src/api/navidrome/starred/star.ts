import type { NavidromeClient } from "../client";
import type { StarredItemType } from "@/api/types";
import { SubsonicResponse } from "../types";

export interface StarResult {
  success: boolean;
}

export async function star(
  client: NavidromeClient,
  id: string,
  type: StarredItemType = 'song'
): Promise<StarResult> {
  // Subsonic's star endpoint distinguishes entity type by param name, not value.
  const params: Record<string, string> = type === 'album' ? { albumId: id } : { id };
  const raw = await client.request<SubsonicResponse>("star.view", params);
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}