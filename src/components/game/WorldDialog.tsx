import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createWorld, listFolders, updateWorld } from "@/lib/game.functions";

const EMOJIS = ["\u{1F393}", "\u269B\uFE0F", "\u{1F9EA}", "\u{1F9EC}", "\u{1F4D0}", "\u{1F5FF}", "\u{1F680}", "\u{1F4DA}"];
const THEMES = ["sakura", "ocean", "ember", "forest", "violet"] as const;

export type WorldDraft = {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  custom_color: string | null;
  folder_id?: string | null;
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

  const mut = useMutation<WorldDraft>({
    mutationFn: async () =>
      (editing
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
          })) as Promise<WorldDraft>,
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



