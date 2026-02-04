import type { NavidromeClient } from "../client";

export async function startScan(
  client: NavidromeClient
): Promise<{ success: boolean; message?: string }> {
  try {
    const startData = await client.request<any>("startScan.view", {}, { method: "POST" });
    const ok = startData["subsonic-response"]?.status === "ok";
    if (!ok) return { success: false, message: "Failed to start scan." };

    const poll = async () => {
      const json = await client.request<any>("getScanStatus.view");
      return json["subsonic-response"]?.scanStatus?.scanning === "true";
    };

    let retry = 0;
    while (retry < 60 && (await poll())) {
      await new Promise((r) => setTimeout(r, 5000));
      retry++;
    }

    return retry >= 60
      ? { success: false, message: "Scan timed out." }
      : { success: true, message: "Scan completed." };
  } catch {
    return { success: false, message: "Navidrome scan failed." };
  }
}