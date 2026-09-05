import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Guarded: on devices where storage access throws (some Android browsers),
    // these calls must never leave the app stuck on the loading screen.
    try {
      const { data } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setLoading(false);
    }

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribe?.();
  }, []);

  return { session, user: session?.user ?? null, loading };
}
