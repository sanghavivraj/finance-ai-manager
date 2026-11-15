// Tiny in-memory TTL cache so repeated dashboard loads don't re-run the
// full context build + LLM call every time.
const store = new Map();

export const cached = async (key, ttlMs, producer) => {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await producer();
  store.set(key, { value, expires: Date.now() + ttlMs });
  if (store.size > 500) store.delete(store.keys().next().value); // bound memory
  return value;
};

export const clearCache = () => store.clear();
