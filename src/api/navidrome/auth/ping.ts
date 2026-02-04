import type { NavidromeClient } from "../client";

export async function ping(client: NavidromeClient): Promise<boolean> {
  try {
    const data = await client.request<any>("ping.view");
    return data["subsonic-response"]?.status === "ok";
  } catch {
    return false;
  }
}