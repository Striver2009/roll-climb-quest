import { useMemo, useState } from "react";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(len = 6) {
  const bytes = new Uint32Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i += 1) {
    const n = bytes[i] || Math.floor(Math.random() * 0xffffffff);
    out += ALPHABET[n % ALPHABET.length];
  }
  return out;
}

/**
 * Guard rail for destructive / irreversible actions: a fresh random code is
 * shown and must be typed back before the action unlocks.
 */
export function CodeConfirm({
  title,
  detail,
  confirmLabel,
  tone = "danger",
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  detail?: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const code = useMemo(() => makeCode(), []);
  const [typed, setTyped] = useState("");
  const ok = typed.trim().toUpperCase() === code;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="panel anim-pop w-full max-w-md p-6 text-center">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        {detail && <p className="mt-2 text-muted-foreground">{detail}</p>}

        <p className="mt-5 text-sm font-bold">Type this safety code to continue:</p>
        <p
          className="mt-2 select-all rounded-xl border-2 border-dashed border-border bg-muted px-4 py-3 font-mono text-3xl font-extrabold tracking-[0.35em]"
          aria-label={`Safety code ${code.split("").join(" ")}`}
        >
          {code}
        </p>

        <label className="sr-only" htmlFor="safety-code">
          Safety code
        </label>
        <input
          id="safety-code"
          value={typed}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="mt-4 w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.3em]"
        />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 font-display font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ok || pending}
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-3 font-display font-extrabold shadow-toy disabled:opacity-50 ${
              tone === "danger"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
