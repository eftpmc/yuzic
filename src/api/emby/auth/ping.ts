import type { EmbyClient } from "../client";

export async function ping(client: EmbyClient): Promise<boolean> {
  try {
    await client.requestText("/System/Ping", { tokenOnly: true });
    return true;
  } catch {
    return false;
  }
}
