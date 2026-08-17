import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import mascotImg from "@/assets/mascot.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { listFolders, listWorlds, moveWorldToFolder, syncProfile } from "@/lib/game.functions";
import { localDateString, localTimezone } from "@/lib/localdate";
import { Loading } from "@/components/game/Loading";
import { WorldDialog, type WorldDraft } from "@/components/game/WorldDialog";
import { FolderDialog, type FolderDraft } from "@/components/game/FolderDialog";


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
  const fetchFolders = useServerFn(listFolders);
  const moveWorld = useServerFn(moveWorldToFolder);
  const today = localDateString();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorldDraft | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDraft | "new" | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = all

  const worlds = useQuery({
    queryKey: ["worlds", today],
    queryFn: () => fetchWorlds({ data: { localDate: today } }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const folders = useQuery({
    queryKey: ["folders"],
    queryFn: () => fetchFolders({}),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
  });

  const move = useMutation({
    mutationFn: (vars: { id: string; folderId: string | null }) =>
      moveWorld({ data: vars }),
    onMutate: (vars) => {
      // Instant: the card jumps folders before the server answers.
      qc.setQueriesData<Array<{ id: string; folder_id: string | null }>>(
        { queryKey: ["worlds"] },
        (old) =>
          old ? old.map((w) => (w.id === vars.id ? { ...w, folder_id: vars.folderId } : w)) : old,
      );
    },
    onError: () => {
      toast.error("🏕️ Could not move that world.");
      void qc.invalidateQueries({ queryKey: ["worlds"] });
    },
  });

  if (worlds.isLoading && !worlds.data) return <Loading label="Loading your study worlds..." />;
  if (worlds.isError)
    return (
      <ErrorState
        message="🌧️ The connection wandered off."
        onRetry={() => void qc.invalidateQueries({ queryKey: ["worlds"] })}
      />
    );

  const all = worlds.data ?? [];
  const folderList = folders.data ?? [];
  const list =
    activeFolder === null
      ? all
      : activeFolder === "unfiled"
        ? all.filter((w) => !w.folder_id)
        : all.filter((w) => w.folder_id === activeFolder);
  const currentFolder = folderList.find((f) => f.id === activeFolder) ?? null;

  const chip = (active: boolean) =>
    `rounded-full border-2 px-4 py-2 font-display text-sm font-extrabold shadow-card transition-transform active:translate-y-0.5 ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
    }`;

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
              preload="intent"
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

        <nav aria-label="Folders" className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveFolder(null)} className={chip(activeFolder === null)}>
            🗂️ All ({all.length})
          </button>
          {folderList.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveFolder(f.id)}
                className={chip(activeFolder === f.id)}
                style={f.color ? { borderColor: f.color } : undefined}
              >
                {f.emoji} {f.name} ({all.filter((w) => w.folder_id === f.id).length})
              </button>
              {activeFolder === f.id && (
                <button
                  type="button"
                  aria-label={`Edit folder ${f.name}`}
                  onClick={() => setFolderDialog(f)}
                  className="rounded-full border-2 border-border bg-card px-2 py-1 text-sm shadow-card"
                >
                  ✏️
                </button>
              )}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setActiveFolder("unfiled")}
            className={chip(activeFolder === "unfiled")}
          >
            📦 Unfiled ({all.filter((w) => !w.folder_id).length})
          </button>
          <button
            type="button"
            onClick={() => setFolderDialog("new")}
            className="rounded-full border-2 border-dashed border-border bg-card px-4 py-2 font-display text-sm font-extrabold shadow-card"
          >
            + NEW FOLDER
          </button>
        </nav>

        {all.length === 0 && !creating && (
          <div className="panel anim-pop mx-auto mt-10 max-w-lg p-8 text-center">
            <img src={mascotImg} alt="" width={384} height={384} className="anim-float mx-auto w-32" />
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

        {all.length > 0 && list.length === 0 && (
          <p className="panel mt-8 p-6 text-center font-display font-extrabold text-muted-foreground">
            This folder is empty — create a world here or move one in.
          </p>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => {
            const pct = w.run && w.run.total ? Math.round((w.run.currentIndex / w.run.total) * 100) : 0;
            return (
              <div
                key={w.id}
                className={`theme-${w.theme} panel anim-pop group relative overflow-hidden p-5 text-left transition-transform hover:-translate-y-1`}
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

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      to="/world/$id"
                      params={{ id: w.id }}
                      preload="intent"
                      className="inline-block rounded-xl bg-primary px-4 py-2 font-display font-extrabold text-primary-foreground shadow-toy"
                    >
                      ENTER WORLD
                    </Link>
                    <select
                      aria-label={`Folder for ${w.name}`}
                      value={w.folder_id ?? ""}
                      onChange={(e) =>
                        move.mutate({ id: w.id, folderId: e.target.value || null })
                      }
                      className="rounded-xl border-2 border-border bg-card px-2 py-2 text-sm font-bold shadow-card"
                    >
                      <option value="">📦 No folder</option>
                      {folderList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.emoji} {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          {all.length > 0 && (
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

      {creating && (
        <WorldDialog
          defaultFolderId={currentFolder?.id ?? null}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <WorldDialog
          world={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
      {folderDialog && (
        <FolderDialog
          folder={folderDialog === "new" ? undefined : folderDialog}
          onClose={() => {
            if (folderDialog !== "new" && activeFolder === folderDialog.id) setActiveFolder(null);
            setFolderDialog(null);
          }}
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
