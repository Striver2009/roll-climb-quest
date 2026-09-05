import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Project-specific replacement for the generated `attachSupabaseAuth`.
 *
 * Root cause it fixes: the generated attacher forwards whatever
 * `getSession()` returns, including an already-expired access token (very
 * common when a tab has been idle, the device slept, or the user comes back
 * the next morning). The server then rejects every call with "Unauthorized"
 * and the whole screen falls back to the connection-error card.
 *
 * Here we proactively refresh when the token is missing or about to expire,
 * so the request always carries a valid bearer token.
 */
const SKEW_SECONDS = 60;

async function freshAccessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return undefined;

  const expiresAt = session.expires_at ?? 0;
  const stale = !session.access_token || expiresAt - SKEW_SECONDS <= Math.floor(Date.now() / 1000);
  if (!stale) return session.access_token;

  const refreshed = await supabase.auth.refreshSession();
  return refreshed.data.session?.access_token ?? session.access_token;
}

export const attachSupabaseAuthFresh = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      token = await freshAccessToken();
    } catch {
      token = undefined;
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
