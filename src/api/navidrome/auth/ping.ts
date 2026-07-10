import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export async function ping(client: NavidromeClient): Promise<boolean> {
  try {
    const data = await client.request<SubsonicResponse>("ping.view");
    return data["subsonic-response"]?.status === "ok";
  } catch {
    return false;
  }
}