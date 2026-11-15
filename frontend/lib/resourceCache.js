"use client";

/**
 * Scoped in-memory resource cache and in-flight request deduplicator.
 * Keyed strictly by actor session token + target patient ID + normalized path.
 * In-memory only (NEVER persisted to localStorage/IndexedDB to prevent private PII leakage).
 * Invalidate automatically on:
 *  - 401 session expiry or manual logout (catalyst:logout)
 *  - Patient switch (catalyst:patient_switched)
 *  - Explicit mutation writes (POST/PUT/DELETE/PATCH)
 */

function getLocalToken() {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("catalyst_token") ||
    window.localStorage.getItem("caresetu_token") ||
    window.localStorage.getItem("aushadh_token") ||
    null
  );
}

function getLocalPatientId() {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("catalyst_patient_id") ||
    window.localStorage.getItem("caresetu_patient_id") ||
    window.localStorage.getItem("aushadh_patient_id") ||
    null
  );
}

const cacheStore = new Map();
const inFlightPromises = new Map();

// Default freshness window for read-only dashboard modules: 15 seconds
export const DEFAULT_TTL_MS = 15000;

export function buildCacheKey(path, actorToken = null, patientId = null) {
  const token = actorToken !== null ? actorToken : getLocalToken();
  const pid = patientId !== null && patientId !== undefined ? patientId : getLocalPatientId();
  return JSON.stringify([token || null, pid || null, path]);
}

export function getCachedResource(key, maxAgeMs = DEFAULT_TTL_MS) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > maxAgeMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedResource(key, data) {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateResource(pathPrefix = "") {
  if (!pathPrefix) {
    clearResourceCache();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (JSON.parse(key)[2].startsWith(pathPrefix)) {
      cacheStore.delete(key);
    }
  }
  for (const key of inFlightPromises.keys()) {
    if (JSON.parse(key)[2].startsWith(pathPrefix)) {
      inFlightPromises.delete(key);
    }
  }
}

export function clearResourceCache() {
  cacheStore.clear();
  inFlightPromises.clear();
}

/**
 * Executes a deduplicated, scoped cached fetch.
 * If an identical GET request is in-flight for this actor+patient+path,
 * it returns the pending promise instead of triggering a second network call.
 */
export async function fetchWithResourceCache(path, fetchFn, options = {}) {
  const { maxAgeMs = DEFAULT_TTL_MS, skipCache = false, signal = null, actorToken = null, patientId = null } = options;
  const key = buildCacheKey(path, actorToken, patientId);

  if (!skipCache) {
    const cached = getCachedResource(key, maxAgeMs);
    if (cached !== null) {
      return cached;
    }
  }

  // The network request is shared across consumers, so a component's
  // AbortSignal must not own/cancel that shared request. Otherwise an effect
  // cleanup (for example React Strict Mode's setup -> cleanup -> setup check)
  // can abort the promise that the next mounted consumer is waiting on.
  let sharedPromise = inFlightPromises.get(key);
  if (!sharedPromise) {
    sharedPromise = Promise.resolve().then(fetchFn).then(
      (data) => {
        if (inFlightPromises.get(key) === sharedPromise && !skipCache && data !== null && data !== undefined) {
          setCachedResource(key, data);
        }
        return data;
      }
    ).finally(() => {
      // Do not delete a newer request started after cache clearing.
      if (inFlightPromises.get(key) === sharedPromise) {
        inFlightPromises.delete(key);
      }
    });
    inFlightPromises.set(key, sharedPromise);
  }

  // Cancellation is local to this consumer; other consumers continue to
  // receive the shared result. The underlying request has its own API timeout.
  if (!signal) return sharedPromise;
  if (signal.aborted) {
    throw signal.reason || new DOMException("The operation was aborted", "AbortError");
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(signal.reason || new DOMException("The operation was aborted", "AbortError"));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    sharedPromise.then(
      (data) => {
        cleanup();
        resolve(data);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}

// Auto-register cache flush on logout and patient-switch events
if (typeof window !== "undefined") {
  window.addEventListener("catalyst:logout", () => {
    clearResourceCache();
  });
  window.addEventListener("catalyst:patient_switched", () => {
    clearResourceCache();
  });
}
