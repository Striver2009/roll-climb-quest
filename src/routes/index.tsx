import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import mascotImg from "@/assets/mascot.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { createWorld, listWorlds, syncProfile } from "@/lib/game.functions";
import { localDateString, localTimezone } from "@/lib/localdate";
import { Loading } from "@/components/game/Loading";

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

const THEMES = ["sakura", "ocean", "ember", "forest", "violet"] as const;
const EMOJIS = ["🎓", "⚛️", "🧪", "🧬", "📐", "🗿", "🚀", "📚"];

function HomePage() {
  const { session, loading } = useAuth();
  const sync = useServerFn(syncProfile);

  useEffect(() => {
    if (session) void sync({ data: { timezone: localTimezone() } }).catch(() => {});
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
  const navigate = useNavigate();
  const fetchWorlds = useServerFn(listWorlds);
  const today = localDateString();
  const [creating, setCreating] = useState(false);

  const worlds = useQuery({
    queryKey: ["worlds", today],
    queryFn: () => fetchWorlds({ data: { localDate: today } }),
  });

  if (worlds.isLoading) return <Loading label="Loading your study worlds..." />;
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


type WorldDraft = {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  custom_color: string | null;
};

export function WorldDialog({
  world,
  onClose,
  onSaved,
}: {
  world?: WorldDraft;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createWorld);
  const update = useServerFn(updateWorld);
  const editing = Boolean(world);

  const [name, setName] = useState(world?.name ?? "");
  const [emoji, setEmoji] = useState(world?.emoji ?? EMOJIS[0]!);
  const [theme, setTheme] = useState<string>(world?.theme ?? "sakura");
  const [color, setColor] = useState(world?.custom_color ?? "#7c6cf0");
  const [tasks, setTasks] = useState<string[]>(editing ? [] : ["DPP", "Module", "PYQ"]);
  const [draft, setDraft] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      editing
        ? update({
            data: {
              id: world!.id,
              name,
              emoji,
              theme,
              customColor: theme === "custom" ? color : null,
            },
          })
        : create({
            data: {
              name,
              emoji,
              theme,
              customColor: theme === "custom" ? color : null,
              tasks: tasks.filter(Boolean),
            },
          }),
    onSuccess: (saved) => {
      // Update caches in place — no blocking refetch before the UI responds.
      qc.setQueriesData<WorldDraft[]>({ queryKey: ["worlds"] }, (old) =>
        old ? old.map((w) => (w.id === saved.id ? { ...w, ...saved } : w)) : old,
      );
      void qc.invalidateQueries({ queryKey: ["worlds"] });
      if (editing) {
        void qc.invalidateQueries({ queryKey: ["world", saved.id] });
        toast.success("✨ Study world updated!");
        onSaved?.();
        onClose();
      } else {
        toast.success("🌸 Study world created!");
        void navigate({ to: "/world/$id", params: { id: saved.id } });
      }
    },
    onError: () => toast.error("🏕️ Our mountain camp is temporarily unavailable."),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit study world" : "Create a new study world"}
    >
      <div className="panel anim-pop max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 className="font-display text-2xl font-extrabold">
          {editing ? "✏️ EDIT STUDY WORLD" : "+ CREATE NEW STUDY WORLD"}
        </h2>

        <label className="mt-4 block text-sm font-bold" htmlFor="world-name">
          World name
        </label>
        <input
          id="world-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="NEET 2028"
          className="mt-1 w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-bold"
        />

        <fieldset className="mt-4">
          <legend className="text-sm font-bold">Badge</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={`h-11 w-11 rounded-xl border-2 text-xl ${emoji === e ? "border-primary bg-muted" : "border-border bg-card"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm font-bold">Colour</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
                className={`theme-${t} world-gradient h-10 w-16 rounded-xl border-2 ${theme === t ? "border-primary" : "border-border"}`}
                aria-label={t}
              />
            ))}
            <button
              type="button"
              aria-pressed={theme === "custom"}
              onClick={() => setTheme("custom")}
              className={`theme-custom world-gradient grid h-10 w-16 place-items-center rounded-xl border-2 text-xs font-extrabold ${theme === "custom" ? "border-primary" : "border-border"}`}
              style={{ ["--world-base" as string]: color }}
              aria-label="Custom colour"
            >
              🎨
            </button>
          </div>
          {theme === "custom" && (
            <div className="anim-fade-in mt-3 flex items-center gap-3">
              <label className="text-sm font-bold" htmlFor="world-color">
                Pick your colour
              </label>
              <input
                id="world-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-xl border-2 border-border bg-card"
              />
              <span className="font-mono text-sm font-bold uppercase">{color}</span>
            </div>
          )}
        </fieldset>

        {!editing && (
          <>
            <label className="mt-5 block text-sm font-bold" htmlFor="task-input">
              Missions
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="task-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    setTasks((t) => [...t, draft.trim()]);
                    setDraft("");
                  }
                }}
                placeholder="MTG, Revision, Flashcards..."
                className="flex-1 rounded-xl border-2 border-input bg-card px-4 py-3 font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  if (!draft.trim()) return;
                  setTasks((t) => [...t, draft.trim()]);
                  setDraft("");
                }}
                className="rounded-xl bg-accent px-4 py-3 font-display font-extrabold text-accent-foreground"
              >
                ADD
              </button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tasks.map((t, i) => (
                <li
                  key={`${t}-${i}`}
                  className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 font-bold"
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => setTasks((list) => list.filter((_, idx) => idx !== i))}
                    className="text-destructive"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 font-display font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || (!editing && tasks.length === 0) || mut.isPending}
            onClick={() => mut.mutate()}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-display font-extrabold text-primary-foreground shadow-toy disabled:opacity-50"
          >
            {mut.isPending ? "Saving..." : editing ? "SAVE CHANGES" : "CREATE WORLD"}
          </button>
        </div>
      </div>
    </div>
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
