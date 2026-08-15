import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getStoredGuestSession = (): Session | null => {
      if (typeof localStorage === "undefined") return null;
      const stored = localStorage.getItem("dev_guest_session");
      if (stored) {
        try {
          return JSON.parse(stored) as Session;
        } catch {}
      }
      return null;
    };

    const initialGuest = getStoredGuestSession();
    if (initialGuest) {
      setSession(initialGuest);
      setLoading(false);
    }

    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) {
        setSession(s);
        localStorage.removeItem("dev_guest_session");
      } else {
        const guest = getStoredGuestSession();
        setSession(guest);
      }
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) {
        setSession(d.session);
        localStorage.removeItem("dev_guest_session");
      } else {
        const guest = getStoredGuestSession();
        setSession(guest);
      }
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}
