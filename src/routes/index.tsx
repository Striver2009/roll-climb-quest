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
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (res.error) {
              setBusy(false);
              toast.error("🌧️ The connection wandered off. Try again.");
            }
          }}
          className="mt-7 w-full rounded-2xl bg-primary px-6 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-toy transition-transform active:translate-y-1 active:shadow-none disabled:opacity-70"
        >
          {busy ? "Opening..." : "CONTINUE WITH GOOGLE"}
        </button>
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
              onClick={() => void supabase.auth.signOut()}
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
