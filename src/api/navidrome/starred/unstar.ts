import type { NavidromeClient } from "../client";

export interface UnstarResult {
  success: boolean;
}

export async function unstar(
  client: NavidromeClient,
  id: string
): Promise<UnstarResult> {
  const raw = await client.request<any>("unstar.view", { id });
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}