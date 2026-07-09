import type { NavidromeClient } from "../client";
import type { StarredItemType } from "@/api/types";

export interface UnstarResult {
  success: boolean;
}

export async function unstar(
  client: NavidromeClient,
  id: string,
  type: StarredItemType = 'song'
): Promise<UnstarResult> {
  const params: Record<string, string> = type === 'album' ? { albumId: id } : { id };
  const raw = await client.request<any>("unstar.view", params);
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}