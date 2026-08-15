import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getSettings, getStats, updateSettings } from "@/lib/game.functions";
import { ENVIRONMENTS } from "@/components/game/WeatherLayer";
import { Loading } from "@/components/game/Loading";
import { useAuth } from "@/hooks/useAuth";
import { gameAudio } from "@/lib/audio";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — Daily Study Dice" },
      {
        name: "description",
        content:
          "Choose your mountain weather, music and sound levels, and animation intensity for your daily study adventure.",
      },
      { property: "og:title", content: "Settings — Daily Study Dice" },
      {
        property: "og:description",
        content: "Tune weather, audio and motion for your study mountain.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const fetchStats = useServerFn(getStats);
  const save = useServerFn(updateSettings);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings({}),
    enabled: Boolean(session),
  });
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats({}),
    enabled: Boolean(session),
  });

  const mut = useMutation({
    mutationFn: (patch: Parameters<typeof updateSettings>[0] extends never ? never : Record<string, unknown>) =>
      save({ data: patch as never }),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast.error("🏕️ Couldn't save that just yet."),
  });

  if (loading || settings.isLoading) return <Loading label="Opening your rucksack..." />;
  if (!session)
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="panel p-8 text-center">
          <p className="font-display text-xl font-extrabold">Sign in to change your settings.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-display font-extrabold text-primary-foreground shadow-toy">
            GO HOME
          </Link>
        </div>
      </main>
    );

  const s = settings.data;
  if (!s) return <Loading label="Opening your rucksack..." />;

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold text-outline">⚙️ SETTINGS</h1>
          <Link to="/" className="rounded-xl border-2 border-border bg-card px-4 py-2 font-display font-bold shadow-card">
            ← Worlds
          </Link>
        </div>

        <section className="panel mt-6 p-5">
          <h2 className="font-display text-xl font-extrabold">🌦️ Mountain weather</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={s.environment === e.id}
                onClick={() => mut.mutate({ environment: e.id })}
                className={`rounded-xl border-2 px-3 py-3 font-bold ${s.environment === e.id ? "border-primary bg-muted" : "border-border bg-card"}`}
              >
                <span className="block text-2xl">{e.emoji}</span>
                {e.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel mt-5 p-5">
          <h2 className="font-display text-xl font-extrabold">🔊 Audio</h2>
          <Toggle label="Master mute" value={s.master_mute} onChange={(v) => mut.mutate({ masterMute: v })} />
          <Toggle label="Music" value={s.music_enabled} onChange={(v) => mut.mutate({ musicEnabled: v })} />
          <Toggle label="Sound effects" value={s.effects_enabled} onChange={(v) => mut.mutate({ effectsEnabled: v })} />
          <Slider
            label="Music volume"
            value={s.music_volume}
            onChange={(v) => mut.mutate({ musicVolume: v })}
          />
          <Slider
            label="Effects volume"
            value={s.effects_volume}
            onChange={(v) => {
              gameAudio.setPrefs({ effectsVolume: v });
              gameAudio.click();
              mut.mutate({ effectsVolume: v });
            }}
          />
        </section>

        <section className="panel mt-5 p-5">
          <h2 className="font-display text-xl font-extrabold">✨ Animations</h2>
          <div className="mt-3 flex gap-2">
            {(["full", "reduced", "off"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={s.animation_mode === m}
                onClick={() => mut.mutate({ animationMode: m })}
                className={`flex-1 rounded-xl border-2 px-3 py-3 font-display font-extrabold capitalize ${s.animation_mode === m ? "border-primary bg-muted" : "border-border bg-card"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="panel mt-5 p-5">
          <h2 className="font-display text-xl font-extrabold">🏆 Explorer record</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Summit days" value={stats.data?.total_completed_days ?? 0} />
            <Stat label="Missions" value={stats.data?.total_completed_tasks ?? 0} />
            <Stat label="Streak" value={stats.data?.current_streak ?? 0} />
            <Stat label="Best streak" value={stats.data?.longest_streak ?? 0} />
          </dl>

        </section>
      </div>
    </main>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mt-3 flex items-center justify-between gap-4">
      <span className="font-bold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`h-8 w-14 rounded-full border-2 border-border transition-colors ${value ? "bg-meadow" : "bg-muted"}`}
      >
        <span
          className="block h-6 w-6 rounded-full bg-card shadow-card transition-transform"
          style={{ transform: `translateX(${value ? 26 : 2}px)` }}
        />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="font-bold">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-primary"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-extrabold">{value}</dd>
    </div>
  );
}
