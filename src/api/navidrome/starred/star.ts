import type { NavidromeClient } from "../client";

export interface StarResult {
  success: boolean;
}

export async function star(
  client: NavidromeClient,
  id: string
): Promise<StarResult> {
  const raw = await client.request<any>("star.view", { id });
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}