import type { JellyfinClient } from "../client";

export async function ping(client: JellyfinClient): Promise<boolean> {
  try {
    await client.request("/System/Ping", { tokenOnly: true });
    return true;
  } catch {
    return false;
  }
}