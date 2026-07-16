// lib/queryCache.js
// In-memory + sessionStorage cache for query results

const memCache = new Map();

function getCacheKey(sessionId, query) {
  return `${sessionId}::${query.trim().toLowerCase()}`;
}

export function getCachedResult(sessionId, query) {
  const key = getCacheKey(sessionId, query);
  // Check memory first
  if (memCache.has(key)) return memCache.get(key);
  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem(`qc_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      memCache.set(key, parsed); // warm memory cache
      return parsed;
    }
  } catch (_) {}
  return null;
}

export function setCachedResult(sessionId, query, result) {
  const key = getCacheKey(sessionId, query);
  memCache.set(key, result);
  try {
    sessionStorage.setItem(`qc_${key}`, JSON.stringify(result));
  } catch (_) {}
}

export function clearCache(sessionId) {
  // Clear memory
  for (const key of memCache.keys()) {
    if (key.startsWith(`${sessionId}::`)) memCache.delete(key);
  }
  // Clear sessionStorage
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(`qc_${sessionId}::`)) toRemove.push(k);
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (_) {}
}