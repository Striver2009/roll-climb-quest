/**
 * Some Android browsers (Chrome with "Block all cookies", WebViews embedded in
 * other apps, and private-mode variants) make `window.localStorage` throw a
 * SecurityError on *access*. The Supabase auth client reads it during
 * `getSession()`, so the very first render threw and the whole app fell back to
 * the "This page didn't load" card for those users.
 *
 * Installing an in-memory fallback keeps the app fully usable there — the only
 * cost is that the session does not survive a page reload.
 */
function usable(kind: "localStorage" | "sessionStorage"): boolean {
  try {
    const s = window[kind];
    const probe = "__probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  } as Storage;
}

export function installStorageFallback() {
  if (typeof window === "undefined") return;
  for (const kind of ["localStorage", "sessionStorage"] as const) {
    if (usable(kind)) continue;
    try {
      Object.defineProperty(window, kind, {
        configurable: true,
        value: memoryStorage(),
      });
    } catch {
      /* nothing more we can do; callers below are already guarded */
    }
  }
}

installStorageFallback();
