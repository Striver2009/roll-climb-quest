import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";

const KEY = "dsd-query-cache-v1";
const MAX_AGE = 12 * 60 * 60 * 1000;

/**
 * Tiny localStorage persister: paints the last known worlds/route instantly on
 * reload so the app never shows an empty loading screen, then refetches quietly.
 */
export function attachQueryPersistence(client: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { t: number; state: unknown };
      if (Date.now() - parsed.t < MAX_AGE) hydrate(client, parsed.state);
      else window.localStorage.removeItem(KEY);
    }
  } catch {
    /* corrupted cache — ignore */
  }

  let timer: number | undefined;
  client.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          KEY,
          JSON.stringify({ t: Date.now(), state: dehydrate(client) }),
        );
      } catch {
        /* quota — ignore */
      }
    }, 600);
  });
}

export function clearPersistedQueries() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
