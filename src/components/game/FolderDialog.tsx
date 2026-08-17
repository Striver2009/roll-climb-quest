import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createFolder, deleteFolder, updateFolder } from "@/lib/game.functions";

export type FolderDraft = {
  id: string;
  name: string;
  emoji: string;
  color: string | null;
};

export function FolderDialog({
  folder,
  onClose,
}: {
  folder?: FolderDraft | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createFolder);
  const update = useServerFn(updateFolder);
  const remove = useServerFn(deleteFolder);
  const editing = Boolean(folder);

  const [name, setName] = useState(folder?.name ?? "");
  const [emoji, setEmoji] = useState(folder?.emoji ?? "\u{1F4C1}");
  const [useColor, setUseColor] = useState(Boolean(folder?.color));
  const [color, setColor] = useState(folder?.color ?? "#7c6cf0");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["folders"] });
    void qc.invalidateQueries({ queryKey: ["worlds"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, emoji, color: useColor ? color : null };
      return editing
        ? update({ data: { id: folder!.id, ...payload } })
        : create({ data: payload });
    },
    onSuccess: (saved) => {
      qc.setQueryData<FolderDraft[]>(["folders"], (old) =>
        old
          ? editing
            ? old.map((f) => (f.id === saved.id ? { ...f, ...saved } : f))
            : [...old, saved]
          : old,
      );
      refresh();
      toast.success(editing ? "📁 Folder updated!" : "📁 Folder created!");
      onClose();
    },
    onError: () => toast.error("🏕️ Could not save that folder. Try again."),
  });

  const del = useMutation({
    mutationFn: async () => remove({ data: { id: folder!.id } }),
    onSuccess: () => {
      qc.setQueryData<FolderDraft[]>(["folders"], (old) =>
        old ? old.filter((f) => f.id !== folder!.id) : old,
      );
      refresh();
      toast.success("🗂️ Folder removed — its worlds are unfiled.");
      onClose();
    },
    onError: () => toast.error("🏕️ Could not remove that folder."),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit folder" : "Create folder"}
    >
      <div className="panel anim-pop w-full max-w-md p-6">
        <h2 className="font-display text-2xl font-extrabold">
          {editing ? "✏️ EDIT FOLDER" : "📁 NEW FOLDER"}
        </h2>

        <label className="mt-4 block text-sm font-bold" htmlFor="folder-name">
          Folder name
        </label>
        <input
          id="folder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Physics, Board Prep, Revision..."
          className="mt-1 w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-bold"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="folder-emoji">
          Folder emoji — type any emoji from your keyboard
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="folder-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
            className="w-24 rounded-xl border-2 border-input bg-card px-4 py-3 text-center text-2xl"
          />
          <p className="text-xs font-bold text-muted-foreground">
            Win + . on Windows, Ctrl + ⌘ + Space on Mac, or the emoji key on mobile.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={useColor}
              onChange={(e) => setUseColor(e.target.checked)}
              className="h-4 w-4"
            />
            Custom folder colour
          </label>
          {useColor && (
            <>
              <input
                type="color"
                aria-label="Folder colour"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-xl border-2 border-border bg-card"
              />
              <span className="font-mono text-sm font-bold uppercase">{color}</span>
            </>
          )}
        </div>

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
            disabled={!name.trim() || !emoji.trim() || save.isPending}
            onClick={() => save.mutate()}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-display font-extrabold text-primary-foreground shadow-toy disabled:opacity-50"
          >
            {save.isPending ? "Saving..." : editing ? "SAVE" : "CREATE FOLDER"}
          </button>
        </div>

        {editing && (
          <button
            type="button"
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="mt-3 w-full rounded-xl border-2 border-destructive px-4 py-2 font-display font-bold text-destructive"
          >
            Delete folder (worlds are kept)
          </button>
        )}
      </div>
    </div>
  );
}
