// Small fetch wrapper for the Worker API. Throws Error(message) on failure.
export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, location.origin);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok || !data?.success) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
