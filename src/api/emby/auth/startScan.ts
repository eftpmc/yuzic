import type { EmbyClient } from "../client";

export async function startScan(
  client: EmbyClient
): Promise<{ success: boolean; message?: string }> {
  try {
    await client.request("/Library/Refresh", { method: "POST" });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      message: (e as Error)?.message ?? "Scan failed",
    };
  }
}
