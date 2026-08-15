import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import mascotImg from "@/assets/mascot.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { listWorlds, syncProfile } from "@/lib/game.functions";
import { localDateString, localTimezone } from "@/lib/localdate";
import { Loading } from "@/components/game/Loading";
import { WorldDialog, type WorldDraft } from "@/components/game/WorldDialog";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daily Study Dice — Roll your daily study adventure" },
      {
        name: "description",
        content:
          "Create study worlds, roll the dice, and climb a cartoon mountain as you finish today's missions in the exact order the dice chose.",
      },
      { property: "og:title", content: "Daily Study Dice — Roll your daily study adventure" },
      {
        property: "og:description",
        content:
          "The dice decides your study order. Follow the locked route, climb the mountain, reach the summit.",
      },
    ],
  }),
  component: HomePage,
});


function HomePage() {
  const { session, loading } = useAuth();
  const sync = useServerFn(syncProfile);
  const synced = useRef<string | null>(null);

  useEffect(() => {
    // Fire-and-forget, once per user — never blocks the first paint.
    const uid = session?.user.id ?? null;
    if (!uid || synced.current === uid) return;
    synced.current = uid;
    void sync({ data: { timezone: localTimezone() } }).catch(() => {});
  }, [session, sync]);

  if (loading) return <Loading label="Preparing your adventure..." />;
  if (!session) return <LoginScreen />;
  return <Worlds />;
}

function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGuestLogin = async () => {
    setBusy(true);
    try {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && anonData?.session) {
        toast.success("🎮 Logged in as Guest!");
        return;
      }

      let guestEmail = localStorage.getItem("dev_guest_email");
      let guestPassword = localStorage.getItem("dev_guest_pass");

      if (!guestEmail || !guestPassword) {
        const rand = Math.random().toString(36).substring(2, 10);
        guestEmail = `guest_${rand}@explore.local`;
        guestPassword = `Pass_${rand}_123!`;
        localStorage.setItem("dev_guest_email", guestEmail);
        localStorage.setItem("dev_guest_pass", guestPassword);
      }

      const { data: signData } = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });

      if (signData?.session) {
        toast.success("🎮 Logged in as Guest!");
        return;
      }

      const { data: upData } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });

      if (upData?.session) {
        toast.success("🎮 Logged in as Guest!");
        return;
      }

      const validUserId = upData?.user?.id ?? signData?.user?.id ?? "00000000-0000-0000-0000-000000000001";
      const token = `dev_guest_token_${validUserId}`;

      const guestSession = {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600 * 24 * 365,
        refresh_token: "dev_guest_refresh",
        user: {
          id: validUserId,
          aud: "authenticated",
          role: "authenticated",
          email: guestEmail,
          app_metadata: { provider: "guest" },
          user_metadata: { name: "Guest Explorer" },
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem("dev_guest_session", JSON.stringify(guestSession));
      toast.success("🎮 Logged in as Guest!");
      window.location.reload();
    } catch (e) {
      toast.error("Guest login failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) {
          toast.error(error.message);
        } else if (data.session) {
          toast.success("Account created & logged in!");
        } else {
          toast.warning("⚠️ Account created! Supabase me 'Confirm Email' ON hai. Dashboard me Email Confirmation OFF karein instant login ke liye.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) {
          toast.error(error.message);
        } else if (data.session) {
          toast.success("Welcome back!");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="grid min-h-screen place-items-center px-4 py-10"
      style={{
        background:
          "radial-gradient(1000px 600px at 50% -10%, oklch(0.93 0.07 20), transparent), linear-gradient(180deg, oklch(0.96 0.05 220), oklch(0.97 0.04 90))",
      }}
    >
      <div className="panel anim-pop w-full max-w-md p-8 text-center">
        <img
          src={mascotImg}
          alt="Scout the explorer mascot holding a dice"
          width={816}
          height={816}
          className="anim-float mx-auto w-40"
        />
        <h1 className="mt-2 font-display text-3xl font-extrabold text-outline">
          🎲 WELCOME, EXPLORER!
        </h1>
        <p className="mt-2 text-muted-foreground">Your study adventure is waiting.</p>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleGuestLogin}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-toy transition-transform active:translate-y-1 active:shadow-none disabled:opacity-70"
          >
            {busy ? "Opening..." : "⚡ CONTINUE AS GUEST"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (res?.error) {
                  const errMsg = res.error.message || "";
                  if (errMsg.includes("missing OAuth secret") || errMsg.includes("validation_failed")) {
                    toast.error("⚠️ Google Auth is not configured in Supabase yet. Use Guest or Email login below!");
                    setShowEmailForm(true);
                  } else {
                    toast.error("🌧️ Could not connect to Google: " + errMsg);
                  }
                }
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-2xl border-2 border-border bg-card px-6 py-3.5 font-display text-base font-bold text-foreground shadow-card transition-transform active:translate-y-1 active:shadow-none disabled:opacity-70"
          >
            🌐 CONTINUE WITH GOOGLE
          </button>

          <button
            type="button"
            onClick={() => setShowEmailForm((prev) => !prev)}
            className="text-xs font-bold text-muted-foreground underline hover:text-foreground"
          >
            {showEmailForm ? "Hide Email Login" : "✉️ Sign in with Email / Password"}
          </button>
        </div>

        {showEmailForm && (
          <form onSubmit={handleEmailAuth} className="mt-5 space-y-3 text-left">
            <div>
              <label className="block text-xs font-extrabold text-muted-foreground mb-1">EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="explorer@example.com"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm font-bold shadow-card focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-muted-foreground mb-1">PASSWORD</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm font-bold shadow-card focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-secondary px-4 py-2.5 font-display text-sm font-extrabold text-secondary-foreground shadow-toy active:translate-y-0.5 active:shadow-none disabled:opacity-70"
            >
              {busy ? "Processing..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsSignUp((p) => !p)}
                className="text-xs font-bold text-muted-foreground hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          You choose the missions. The dice chooses the path.
        </p>
      </div>
    </main>
  );
}

function Worlds() {
  const qc = useQueryClient();
  const fetchWorlds = useServerFn(listWorlds);
  const today = localDateString();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorldDraft | null>(null);

  const worlds = useQuery({
    queryKey: ["worlds", today],
    queryFn: () => fetchWorlds({ data: { localDate: today } }),
    placeholderData: (prev) => prev,
  });

  if (worlds.isLoading && !worlds.data) return <Loading label="Loading your study worlds..." />;
  if (worlds.isError)
    return (
      <ErrorState
        message="🌧️ The connection wandered off."
        onRetry={() => void qc.invalidateQueries({ queryKey: ["worlds"] })}
      />
    );

  const list = worlds.data ?? [];

  return (
    <main
      className="min-h-screen px-4 pb-16 pt-8"
      style={{
        background:
          "radial-gradient(900px 500px at 80% -10%, oklch(0.93 0.07 200), transparent), linear-gradient(180deg, oklch(0.97 0.04 90), oklch(0.96 0.05 20))",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold text-outline sm:text-4xl">
            🗺️ MY STUDY WORLDS
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="rounded-xl border-2 border-border bg-card px-4 py-2 font-display font-bold shadow-card"
            >
              ⚙️ Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("dev_guest_session");
                void supabase.auth.signOut().then(() => window.location.reload());
              }}
              className="rounded-xl border-2 border-border bg-card px-4 py-2 font-display font-bold shadow-card"
            >
              Sign out
            </button>
          </div>
        </header>

        {list.length === 0 && !creating && (
          <div className="panel anim-pop mx-auto mt-10 max-w-lg p-8 text-center">
            <img src={mascotImg} alt="" width={816} height={816} className="anim-float mx-auto w-32" />
            <h2 className="mt-2 font-display text-2xl font-extrabold">
              CREATE YOUR FIRST STUDY WORLD
            </h2>
            <p className="mt-2 text-muted-foreground">
              Name it, add the tasks you repeat, and let the dice plan the order.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-6 rounded-2xl bg-primary px-6 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-toy active:translate-y-1 active:shadow-none"
            >
              + CREATE STUDY WORLD
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => {
            const pct = w.run && w.run.total ? Math.round((w.run.currentIndex / w.run.total) * 100) : 0;
            return (
              <div
                key={w.id}
                className={`theme-${w.theme} panel group relative overflow-hidden p-5 text-left transition-transform hover:-translate-y-1`}
                style={{ ["--world-base" as string]: w.custom_color ?? undefined }}
              >
                <div className="world-gradient absolute inset-x-0 top-0 h-24 opacity-70" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl">{w.emoji}</span>
                    <div className="flex items-center gap-2">
                      {w.current_streak > 0 && (
                        <span className="rounded-full bg-card px-2 py-1 text-xs font-bold shadow-card">
                          🔥 {w.current_streak} DAY STREAK
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit ${w.name}`}
                        onClick={() => setEditing(w)}
                        className="rounded-xl border-2 border-border bg-card px-2 py-1 text-sm font-bold shadow-card"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                  <h2 className="mt-6 font-display text-2xl font-extrabold">{w.name}</h2>
                  <p className="text-sm font-bold text-muted-foreground">
                    {w.taskCount} mission{w.taskCount === 1 ? "" : "s"}
                  </p>

                  <div className="mt-4">
                    {w.run ? (
                      <>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-meadow transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-bold">
                          {w.run.complete
                            ? "🏆 Summit reached today!"
                            : `TODAY: ${w.run.currentIndex} / ${w.run.total} MISSIONS`}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-extrabold text-primary">🎲 NEW ADVENTURE AVAILABLE</p>
                    )}
                  </div>

                  <Link
                    to="/world/$id"
                    params={{ id: w.id }}
                    preload="intent"
                    className="mt-5 inline-block rounded-xl bg-primary px-4 py-2 font-display font-extrabold text-primary-foreground shadow-toy"
                  >
                    ENTER WORLD
                  </Link>
                </div>
              </div>
            );
          })}

          {list.length > 0 && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="panel grid min-h-48 place-items-center border-dashed p-5 font-display text-lg font-extrabold text-muted-foreground transition-transform hover:-translate-y-1"
            >
              + CREATE NEW STUDY WORLD
            </button>
          )}
        </div>
      </div>

      {creating && <WorldDialog onClose={() => setCreating(false)} />}
      {editing && (
        <WorldDialog
          world={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </main>
  );
}


export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="panel p-8 text-center">
        <p className="font-display text-2xl font-extrabold">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-primary px-5 py-3 font-display font-extrabold text-primary-foreground shadow-toy"
        >
          TRY AGAIN
        </button>
      </div>
    </main>
  );
}
