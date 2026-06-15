const store = new Map();

export function clearCache(pattern) {
  if (pattern) {
    for (const key of store.keys()) {
      if (key.startsWith(pattern)) store.delete(key);
    }
  } else {
    store.clear();
  }
}

export async function cacheGet(key, ttlMs, fetchFn) {
  const entry = store.get(key);
  if (entry && Date.now() - entry.time < ttlMs) return entry.data;
  const data = await fetchFn();
  store.set(key, { data, time: Date.now() });
  return data;
}
