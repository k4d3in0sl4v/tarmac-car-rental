// Browser-side fetch helper for the API routes.

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string; fields?: Record<string, string> };

export async function api<T>(path: string, init?: { method?: string; body?: unknown; token?: string }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: {
        ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: 'You seem to be offline. Check your connection and try again.' };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: data as T };
  return { ok: false, status: res.status, error: data?.error ?? `Request failed (${res.status}).`, fields: data?.fields };
}
