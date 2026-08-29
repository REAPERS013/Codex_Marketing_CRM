const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? (
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : null
);

// Crush.lu base URL — used only for SSO initiation (/api/auth/spa-callback/).
// That endpoint lives on crush.lu's urlconf (allauth sessions), not api.crush.lu.
const CRUSH_BASE_URL = process.env.NEXT_PUBLIC_CRUSH_BASE_URL ?? (
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : null
);

const ACCESS_KEY = "hub_access_token";
const REFRESH_KEY = "hub_refresh_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  return isBrowser() ? window.localStorage.getItem(ACCESS_KEY) : null;
}

export function getRefreshToken(): string | null {
  return isBrowser() ? window.localStorage.getItem(REFRESH_KEY) : null;
}

export function setTokens(access: string, refresh: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!API_BASE_URL || !refresh) return null;

  const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = (await response.json()) as { access: string; refresh?: string };
  const nextRefresh = data.refresh ?? refresh;
  setTokens(data.access, nextRefresh);
  return data.access;
}

export async function login(username: string, password: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  const data = (await response.json()) as { access: string; refresh: string };
  setTokens(data.access, data.refresh);
}

// SSO bounce flow: the user is sent to the Django backend's
// /api/auth/spa-callback/ which (after a Crush.lu allauth login if needed)
// 302s back here to /auth/callback?code=ABC. We POST that code to
// /api/token/exchange-code/ to receive a JWT pair.
export async function exchangeCode(code: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/api/token/exchange-code/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Code exchange failed");
  }

  const data = (await response.json()) as { access: string; refresh: string };
  setTokens(data.access, data.refresh);
}

// Build the URL the SSO button sends the user to. The return URL must be
// listed in Django's SPA_CALLBACK_ALLOWED_RETURN_URLS exactly, so we use
// `${window.location.origin}/auth/callback` — for production that resolves
// to https://hub.crush.lu/auth/callback (whitelisted), for local dev to
// http://localhost:3000/auth/callback (also whitelisted under DEBUG).
// NOTE: uses CRUSH_BASE_URL (crush.lu), NOT API_BASE_URL (api.crush.lu) —
// spa-callback lives on crush.lu's urlconf where allauth sessions are.
export function buildSsoUrl(): string | null {
  if (!CRUSH_BASE_URL || typeof window === "undefined") return null;
  const callback = `${window.location.origin}/auth/callback`;
  return `${CRUSH_BASE_URL}/api/auth/spa-callback/?return=${encodeURIComponent(callback)}`;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  clearTokens();
  if (!API_BASE_URL || !refresh) return;
  await fetch(`${API_BASE_URL}/api/token/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  }).catch(() => undefined);
}

async function request<T>(
  path: string,
  init: RequestInit,
  retried = false,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && !retried) {
    const next = await refreshAccessToken();
    if (next) return request<T>(path, init, true);
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload.error === "string") message = payload.error;
      else if (typeof payload.detail === "string") message = payload.detail;
      else {
        const first = Object.entries(payload).find(([, value]) =>
          typeof value === "string" || Array.isArray(value),
        );
        if (first) {
          const value = Array.isArray(first[1]) ? first[1].join(" ") : first[1];
          message = `${first[0]}: ${String(value)}`;
        }
      }
    } catch {
      // Preserve the status-based fallback for non-JSON upstream errors.
    }
    throw new Error(message);
  }

  // 204 / 205 et les corps vides (fréquents sur DELETE) n'ont rien à parser.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const body = await response.text();
  if (!body) return undefined as T;

  return JSON.parse(body) as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: "GET" });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: "DELETE" });
}
