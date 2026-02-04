export interface NavidromeClientConfig {
  serverUrl: string;
  username: string;
  password: string;
}

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type NavidromeClient = ReturnType<typeof createNavidromeClient>;

function buildParams(
  base: Record<string, string>,
  extra: Record<string, string | number> = {}
): string {
  const combined = { ...base, ...Object.fromEntries(
    Object.entries(extra).map(([k, v]) => [k, String(v)])
  ) };
  return new URLSearchParams(combined).toString();
}

export function createNavidromeClient(config: NavidromeClientConfig) {
  const { serverUrl, username, password } = config;
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const baseParams = {
    u: username,
    p: password,
    v: API_VERSION,
    c: CLIENT_NAME,
    f: "json",
  };

  async function request<T>(
    endpoint: string,
    extraParams: Record<string, string | number> = {},
    options: { method?: "GET" | "POST" } = {}
  ): Promise<T> {
    const params = buildParams(baseParams, extraParams);
    const url = `${baseUrl}/rest/${endpoint}?${params}`;
    const res = await fetch(url, { method: options.method ?? "GET" });
    if (!res.ok) {
      throw new Error(`Navidrome API error (${res.status}): ${await res.text()}`);
    }
    return res.json();
  }

  function buildStreamUrl(songId: string): string {
    const params = buildParams(
      { u: username, p: password, v: API_VERSION, c: CLIENT_NAME },
      { id: songId }
    );
    return `${baseUrl}/rest/stream.view?${params}`;
  }

  return {
    request,
    buildStreamUrl,
    serverUrl: baseUrl,
    username,
    password,
  };
}
