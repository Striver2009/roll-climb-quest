import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import mascotImg from "@/assets/mascot.png";
import { BackButton } from "@/components/game/BackButton";
import { Loading } from "@/components/game/Loading";
import { Dice3D } from "@/components/game/Dice3D";
import { Confetti } from "@/components/game/Confetti";
import { MountainScene } from "@/components/game/MountainScene";
import type { EnvName } from "@/components/game/WeatherLayer";
import { WorldDialog } from "@/components/game/WorldDialog";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { gameAudio } from "@/lib/audio";
import { localDateString, msUntilLocalMidnight, prettyDate } from "@/lib/localdate";
import {
  addTask,
  completeTask,
  deleteTask,
  deleteWorld,
  getHistory,
  getSettings,
  getWorld,
  reorderTasks,
  restartToday,
  rollToday,
  updateTask,
  type SequenceItem,
} from "@/lib/game.functions";

export const Route = createFileRoute("/world/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Study World — Daily Study Dice" },
      {
        name: "description",
        content:
          "Roll today's dice, follow the locked mission route, and climb your cartoon mountain one checkpoint at a time.",
      },
      { property: "og:title", content: "Study World — Daily Study Dice" },
      {
        property: "og:description",
        content: "One roll a day. One locked route. One summit to reach.",
      },
    ],
  }),
  component: WorldPage,
});

type Tab = "climb" | "missions" | "history";
type Task = Database["public"]["Tables"]["tasks"]["Row"];

function WorldPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const fetchWorld = useServerFn(getWorld);
  const fetchSettings = useServerFn(getSettings);
  const roll = useServerFn(rollToday);
  const complete = useServerFn(completeTask);

  const [today, setToday] = useState(localDateString());
  const [tab, setTab] = useState<Tab>("climb");
  const [phase, setPhase] = useState<"idle" | "rolling" | "landing">("idle");
  const [overview, setOverview] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [summitOpen, setSummitOpen] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const celebrated = useRef<string | null>(null);

  // Roll over at local midnight without a reload.
  useEffect(() => {
    const t = window.setTimeout(() => setToday(localDateString()), msUntilLocalMidnight() + 1500);
    return () => window.clearTimeout(t);
  }, [today]);

  const [editOpen, setEditOpen] = useState(false);
  const worldKey = useMemo(() => ["world", id, today] as const, [id, today]);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings({}),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });

  const world = useQuery({
    queryKey: worldKey,
    queryFn: () => fetchWorld({ data: { taskSetId: id, localDate: today } }),
    enabled: Boolean(session),
    placeholderData: (prev) => prev,
  });

  type WorldData = NonNullable<typeof world.data>;
  const patchWorld = useCallback(
    (fn: (old: WorldData) => WorldData) => {
      qc.setQueryData(worldKey, (old: WorldData | undefined) => (old ? fn(old) : old));
    },
    [qc, worldKey],
  );

  const motion = (settings.data?.animation_mode ?? "full") as "full" | "reduced" | "off";
  const env = (settings.data?.environment ?? "spring") as EnvName;

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    gameAudio.setPrefs({
      masterMute: s.master_mute,
      musicEnabled: s.music_enabled,
      effectsEnabled: s.effects_enabled,
      musicVolume: s.music_volume,
      effectsVolume: s.effects_volume,
    });
  }, [settings.data]);

  const run = world.data?.run ?? null;
  const sequence = useMemo(() => (run?.sequence as SequenceItem[] | null) ?? [], [run]);
  const currentIndex = run?.current_index ?? 0;
  const done = Boolean(run?.completed_at);

  const rollMut = useMutation({
    mutationFn: () => roll({ data: { taskSetId: id, localDate: today } }),
    onMutate: () => {
      setPhase("rolling");
      gameAudio.diceRoll();
    },
    onSuccess: async (runRow) => {
      await new Promise((r) => setTimeout(r, motion === "off" ? 0 : 620));
      setPhase("landing");
      gameAudio.diceReveal();
      // Write the server's locked route straight into the cache — no extra round trip.
      patchWorld((old) => ({ ...old, run: runRow as WorldData["run"] }));
      void qc.invalidateQueries({ queryKey: ["worlds"] });
      window.setTimeout(() => setPhase("idle"), 450);
    },
    onError: (e: Error) => {
      setPhase("idle");
      gameAudio.error();
      toast.error(
        e.message === "NO_TASKS"
          ? "🎒 Add at least one mission before you roll."
          : "🌧️ The dice slipped. Try again.",
      );
    },
  });

  const completeMut = useMutation({
    mutationFn: (taskId: string) => complete({ data: { dailyRunId: run!.id, taskId } }),
    onMutate: () => {
      // Move the climber immediately; the server row confirms right after.
      const wasLast = currentIndex + 1 >= sequence.length;
      gameAudio.taskComplete();
      if (!wasLast) gameAudio.unlock();
      patchWorld((old) =>
        old.run
          ? {
              ...old,
              run: {
                ...old.run,
                current_index: old.run.current_index + 1,
                completed_at: wasLast ? new Date().toISOString() : old.run.completed_at,
              },
            }
          : old,
      );
    },
    onSuccess: (runRow) => {
      patchWorld((old) => ({ ...old, run: runRow as WorldData["run"] }));
      void qc.invalidateQueries({ queryKey: ["worlds"] });
    },
    onError: (e: Error) => {
      gameAudio.error();
      void qc.invalidateQueries({ queryKey: worldKey });
      toast.error(
        e.message === "TASK_LOCKED"
          ? "🔒 Finish the current checkpoint first — no skipping the trail!"
          : e.message === "ALREADY_COMPLETE"
            ? "🏆 Today's summit is already yours."
            : "🏕️ Our mountain camp is temporarily unavailable.",
      );
    },
  });

  // Summit celebration, once per run.
  useEffect(() => {
    if (!run || !done) return;
    if (celebrated.current === run.id) return;
    celebrated.current = run.id;
    setConfetti((c) => c + 1);
    setSummitOpen(true);
    gameAudio.victory();
  }, [run, done]);

  const onCheckpointClick = useCallback(
    (index: number) => {
      gameAudio.click();
      if (index > currentIndex) {
        toast.info("🔒 Locked — the dice route must be followed in order.");
        return;
      }
      setDetail(index);
    },
    [currentIndex],
  );

  if (loading || (world.isLoading && !world.data))
    return <Loading label="Scouting the mountain..." />;

  if (!session)
    return (
      <Fallback
        title="Sign in to enter this world"
        action={<HomeLink />}
      />
    );

  if (world.isError)
    return (
      <Fallback
        title="🌧️ The connection wandered off."
        action={
          <button
            type="button"
            onClick={() => void world.refetch()}
            className="rounded-xl bg-primary px-5 py-3 font-display font-extrabold text-primary-foreground shadow-toy"
          >
            TRY AGAIN
          </button>
        }
      />
    );

  const w = world.data!.world;
  const tasks = world.data!.tasks;
  const activeTasks = tasks.filter((t) => t.is_active);
  const current = sequence[currentIndex] ?? null;

  return (
    <main
      className={`theme-${w.theme} relative min-h-screen px-3 pb-24 pt-5 sm:px-5`}
      style={{
        background: "var(--color-background)",
        ["--world-base" as string]: w.custom_color ?? undefined,
      }}
    >
      <Confetti fire={confetti} motion={motion} />

      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton fallback="/" label="Worlds" />

            <h1 className="font-display text-2xl font-extrabold text-outline sm:text-3xl">
              {w.emoji} {w.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="panel px-3 py-1 text-sm font-bold">{prettyDate(today)}</span>
            {w.current_streak > 0 && (
              <span className="panel px-3 py-1 text-sm font-bold">🔥 {w.current_streak}</span>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Edit this study world"
              className="rounded-xl border-2 border-border bg-card px-3 py-2 font-display font-bold shadow-card"
            >
              ✏️
            </button>
            <Link
              to="/settings"
              className="rounded-xl border-2 border-border bg-card px-3 py-2 font-display font-bold shadow-card"
            >
              ⚙️
            </Link>
          </div>
        </header>

        <nav className="mt-4 flex gap-2" aria-label="World sections">
          {(
            [
              ["climb", "🧗 CLIMB"],
              ["missions", "🎒 MISSIONS"],
              ["history", "📜 HISTORY"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => {
                gameAudio.click();
                setTab(key);
              }}
              className={`rounded-xl border-2 px-4 py-2 font-display font-extrabold ${tab === key ? "border-primary bg-muted" : "border-border bg-card"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "climb" && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative">
              <MountainScene
                sequence={sequence}
                currentIndex={currentIndex}
                env={env}
                motion={motion}
                overview={overview}
                onCheckpointClick={onCheckpointClick}
              />
              <button
                type="button"
                onClick={() => setOverview((o) => !o)}
                className="panel absolute right-3 top-3 px-3 py-1 text-sm font-bold"
              >
                {overview ? "🔍 Follow climber" : "🗺️ Whole route"}
              </button>
              {sequence.length > 0 && (
                <p className="mt-2 text-center font-display text-lg font-extrabold">
                  {done
                    ? "🏆 SUMMIT REACHED!"
                    : `CHECKPOINT ${Math.min(currentIndex + 1, sequence.length)} OF ${sequence.length}`}
                </p>
              )}
            </div>

            <div>
              {sequence.length === 0 ? (
                <div className="panel grid place-items-center p-6 text-center">
                  <img src={mascotImg} alt="" width={816} height={816} className="anim-float w-28" />
                  <h2 className="mt-2 font-display text-2xl font-extrabold">
                    🎲 ROLL TODAY'S ADVENTURE
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    The dice locks your mission order for {prettyDate(today)}.
                  </p>
                  <Dice3D
                    phase={phase}
                    labels={activeTasks.map((t) => t.title)}
                    motion={motion}
                  />
                  <button
                    type="button"
                    disabled={rollMut.isPending || activeTasks.length === 0}
                    onClick={() => rollMut.mutate()}
                    className="rounded-2xl bg-primary px-7 py-4 font-display text-xl font-extrabold text-primary-foreground shadow-toy active:translate-y-1 active:shadow-none disabled:opacity-60"
                  >
                    {rollMut.isPending ? "ROLLING..." : "ROLL THE DICE"}
                  </button>
                  {activeTasks.length === 0 && (
                    <p className="mt-3 text-sm font-bold text-destructive">
                      Add missions in the 🎒 MISSIONS tab first.
                    </p>
                  )}
                </div>
              ) : (
                <div className="panel p-5">
                  <h2 className="font-display text-xl font-extrabold">
                    {done ? "🏆 TODAY'S ROUTE COMPLETE" : "🎯 CURRENT MISSION"}
                  </h2>
                  {current && !done ? (
                    <>
                      <p className="mt-3 font-display text-2xl font-extrabold">{current.title}</p>
                      {current.description && (
                        <p className="mt-1 text-muted-foreground">{current.description}</p>
                      )}
                      <button
                        type="button"
                        disabled={completeMut.isPending}
                        onClick={() => completeMut.mutate(current.id)}
                        className="mt-5 w-full rounded-2xl bg-meadow px-6 py-4 font-display text-lg font-extrabold text-card shadow-toy active:translate-y-1 active:shadow-none disabled:opacity-60"
                      >
                        {completeMut.isPending ? "CLIMBING..." : "✓ MARK COMPLETE"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 font-bold">
                      Every checkpoint cleared. Come back tomorrow for a fresh route.
                    </p>
                  )}

                  <ol className="mt-6 space-y-2">
                    {sequence.map((item, i) => {
                      const state =
                        i < currentIndex ? "done" : i === currentIndex ? "current" : "locked";
                      return (
                        <li
                          key={item.id}
                          className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${state === "current" ? "border-gold bg-muted" : "border-border bg-card"}`}
                          style={{ opacity: state === "locked" ? 0.6 : 1 }}
                        >
                          <span className="font-display font-extrabold">
                            {state === "done" ? "✓" : state === "locked" ? "🔒" : "🎯"}
                          </span>
                          <span className="flex-1 truncate font-bold">{item.title}</span>
                          <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "missions" && (
          <MissionsTab
            taskSetId={id}
            worldName={w.name}
            tasks={tasks}
            locked={sequence.length > 0}
            patchTasks={(fn) => patchWorld((old) => ({ ...old, tasks: fn(old.tasks) }))}
            onChanged={() => {
              void qc.invalidateQueries({ queryKey: worldKey });
              void qc.invalidateQueries({ queryKey: ["worlds"] });
            }}
            onDeleted={() => void navigate({ to: "/" })}
          />
        )}

        {tab === "history" && <HistoryTab taskSetId={id} />}
      </div>

      {detail !== null && sequence[detail] && (
        <Modal onClose={() => setDetail(null)} label="Checkpoint detail">
          <h2 className="font-display text-2xl font-extrabold">{sequence[detail]!.title}</h2>
          <p className="mt-2 text-muted-foreground">
            {sequence[detail]!.description || "Checkpoint " + (detail + 1)}
          </p>
          <p className="mt-3 font-bold">
            {detail < currentIndex ? "✓ Completed today" : "🎯 Current mission"}
          </p>
        </Modal>
      )}

      {editOpen && (
        <WorldDialog
          world={{
            id: w.id,
            name: w.name,
            emoji: w.emoji,
            theme: w.theme,
            custom_color: w.custom_color,
          }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {summitOpen && (
        <Modal onClose={() => setSummitOpen(false)} label="Summit reached">
          <img src={mascotImg} alt="" width={816} height={816} className="anim-float mx-auto w-32" />
          <h2 className="mt-2 font-display text-3xl font-extrabold text-outline">
            🏆 SUMMIT REACHED!
          </h2>
          <p className="mt-2 font-bold">
            You cleared all {sequence.length} missions in {w.name}.
          </p>
          <button
            type="button"
            onClick={() => setSummitOpen(false)}
            className="mt-5 w-full rounded-2xl bg-primary px-6 py-3 font-display font-extrabold text-primary-foreground shadow-toy"
          >
            AWESOME!
          </button>
        </Modal>
      )}
    </main>
  );
}

function MissionsTab({
  taskSetId,
  worldName,
  tasks,
  locked,
  patchTasks,
  onChanged,
  onDeleted,
}: {
  taskSetId: string;
  worldName: string;
  tasks: Task[];
  locked: boolean;
  patchTasks: (fn: (tasks: Task[]) => Task[]) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const add = useServerFn(addTask);
  const patch = useServerFn(updateTask);
  const remove = useServerFn(deleteTask);
  const reorder = useServerFn(reorderTasks);
  const removeWorld = useServerFn(deleteWorld);
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Every mission edit paints instantly, then syncs in the background.
  const mut = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => onChanged(),
    onError: () => {
      onChanged();
      toast.error("🏕️ Our mountain camp is temporarily unavailable.");
    },
  });

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[index], next[j]] = [next[j]!, next[index]!];
    patchTasks(() => next);
    mut.mutate(() => reorder({ data: { taskSetId, ids: next.map((t) => t.id) } }));
  };

  return (
    <section className="panel mt-5 p-5">
      <h2 className="font-display text-xl font-extrabold">🎒 MISSIONS</h2>
      {locked && (
        <p className="mt-2 rounded-xl bg-muted p-3 text-sm font-bold">
          Today's route is already locked. Changes apply from tomorrow's roll.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="new-mission">
          New mission
        </label>
        <input
          id="new-mission"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a mission (DPP, PYQ, Revision...)"
          className="flex-1 rounded-xl border-2 border-input bg-card px-4 py-3 font-bold"
        />
        <button
          type="button"
          disabled={!title.trim()}
          onClick={() => {
            const t = title.trim();
            setTitle("");
            patchTasks((list) => [
              ...list,
              {
                task_set_id: taskSetId,
                user_id: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                id: `temp-${Date.now()}`,
                title: t,
                description: null,
                is_active: true,
                position: list.length,
              },
            ]);
            mut.mutate(() => add({ data: { taskSetId, title: t } }));
          }}
          className="rounded-xl bg-primary px-5 py-3 font-display font-extrabold text-primary-foreground shadow-toy disabled:opacity-50"
        >
          ADD
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {tasks.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2"
            style={{ opacity: t.is_active ? 1 : 0.55 }}
          >
            <span className="flex flex-col">
              <button type="button" aria-label={`Move ${t.title} up`} onClick={() => move(i, -1)}>
                ▲
              </button>
              <button type="button" aria-label={`Move ${t.title} down`} onClick={() => move(i, 1)}>
                ▼
              </button>
            </span>
            <span className="flex-1 truncate font-bold">{t.title}</span>
            <button
              type="button"
              onClick={() => {
                patchTasks((list) =>
                  list.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)),
                );
                mut.mutate(() => patch({ data: { id: t.id, isActive: !t.is_active } }));
              }}
              className="rounded-lg bg-muted px-2 py-1 text-xs font-bold"
            >
              {t.is_active ? "Pause" : "Activate"}
            </button>
            <button
              type="button"
              aria-label={`Delete ${t.title}`}
              onClick={() => {
                patchTasks((list) => list.filter((x) => x.id !== t.id));
                mut.mutate(() => remove({ data: { id: t.id } }));
              }}
              className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t-2 border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">Delete “{worldName}” and all its history?</p>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border-2 border-border bg-card px-4 py-2 font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await removeWorld({ data: { id: taskSetId } });
                  onDeleted();
                } catch {
                  toast.error("🏕️ Couldn't delete that world.");
                }
              }}
              className="rounded-xl bg-destructive px-4 py-2 font-display font-extrabold text-destructive-foreground"
            >
              DELETE WORLD
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm font-bold text-destructive"
          >
            Delete this study world
          </button>
        )}
      </div>
    </section>
  );
}

function HistoryTab({ taskSetId }: { taskSetId: string }) {
  const fetchHistory = useServerFn(getHistory);
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["history", taskSetId, page],
    queryFn: () => fetchHistory({ data: { taskSetId, page } }),
  });

  if (q.isLoading) return <Loading label="Reading your travel log..." />;
  const runs = q.data?.runs ?? [];
  const pages = Math.ceil((q.data?.count ?? 0) / (q.data?.pageSize ?? 10));

  return (
    <section className="panel mt-5 p-5">
      <h2 className="font-display text-xl font-extrabold">📜 TRAVEL LOG</h2>
      {runs.length === 0 && <p className="mt-3 text-muted-foreground">No expeditions yet.</p>}
      <ul className="mt-4 space-y-2">
        {runs.map((r) => {
          const seq = (r.sequence as SequenceItem[]) ?? [];
          return (
            <li key={r.id} className="rounded-xl border-2 border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-extrabold">{prettyDate(r.local_date)}</span>
                <span className="text-sm font-bold">
                  {r.completed_at ? "🏆 Summit" : `${r.current_index}/${seq.length}`}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {seq.map((s) => s.title).join(" → ")}
              </p>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border-2 border-border bg-card px-4 py-2 font-bold disabled:opacity-40"
          >
            ← Newer
          </button>
          <span className="font-bold">
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border-2 border-border bg-card px-4 py-2 font-bold disabled:opacity-40"
          >
            Older →
          </button>
        </div>
      )}
    </section>
  );
}

function Modal({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <div
        className="panel anim-pop w-full max-w-md p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function HomeLink() {
  return (
    <Link
      to="/"
      className="rounded-xl bg-primary px-5 py-3 font-display font-extrabold text-primary-foreground shadow-toy"
    >
      GO HOME
    </Link>
  );
}

function Fallback({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="panel p-8 text-center">
        <p className="font-display text-2xl font-extrabold">{title}</p>
        <div className="mt-5">{action}</div>
      </div>
    </main>
  );
}
