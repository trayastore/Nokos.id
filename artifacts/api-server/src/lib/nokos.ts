const BASE_URL = (process.env.NOKOS_BASE_URL || "https://nokos.co.id/api/").replace(/\/+$/, "");
const API_KEY  = process.env.NOKOS_API_KEY || "";

function buildUrl(action: string, params: Record<string, string> = {}): string {
  const url = new URL(BASE_URL + "/");
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function nokosGet(action: string, params: Record<string, string> = {}) {
  const res = await fetch(buildUrl(action, params), {
    headers: { "X-API-Key": API_KEY },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Nokos API non-JSON response: ${text.slice(0, 200)}`);
  }
}

export async function nokosPost(action: string, body: Record<string, string>) {
  const res = await fetch(buildUrl(action), {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Nokos API non-JSON response: ${text.slice(0, 200)}`);
  }
}
