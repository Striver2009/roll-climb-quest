import { useEffect, useState } from "react";

type Phase = "idle" | "rolling" | "landing";

export function Dice3D({
  phase,
  labels,
  motion,
  size = 132,
}: {
  phase: Phase;
  labels: string[];
  motion: "full" | "reduced" | "off";
  size?: number;
}) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (phase !== "rolling" || motion === "off" || labels.length === 0) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 110);
    return () => window.clearInterval(id);
  }, [phase, motion, labels.length]);

  const spin =
    motion === "off"
      ? "none"
      : phase === "rolling"
        ? `dice-spin ${motion === "reduced" ? "2.4s" : "1.15s"} linear infinite`
        : phase === "landing"
          ? "dice-land 0.5s cubic-bezier(.3,1.6,.5,1) both"
          : "float-soft 4s ease-in-out infinite";

  const shake =
    phase === "rolling" && motion === "full" ? "dice-shake .28s ease-in-out infinite" : "none";

  const label = labels.length ? labels[cycle % labels.length]! : "🎲";

  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.9, height: size * 1.9 }}>
      {/* glow */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.7,
          height: size * 1.7,
          background:
            "radial-gradient(circle, oklch(0.9 0.16 85 / 0.55) 0%, oklch(0.9 0.16 85 / 0) 70%)",
        }}
      />
      {/* particles */}
      {phase !== "idle" && motion !== "off" && (
        <div aria-hidden className="absolute inset-0">
          {Array.from({ length: motion === "reduced" ? 6 : 14 }).map((_, i) => {
            const a = (i / (motion === "reduced" ? 6 : 14)) * Math.PI * 2;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 block h-2 w-2 rounded-full bg-gold"
                style={{
                  ["--dx" as string]: `${Math.cos(a) * size * 1.1}px`,
                  ["--dy" as string]: `${Math.sin(a) * size * 1.1}px`,
                  animation: `spark-out ${0.7 + (i % 4) * 0.12}s ease-out ${i * 0.05}s infinite`,
                }}
              />
            );
          })}
        </div>
      )}

      <div style={{ animation: shake }}>
        <div
          className="relative"
          style={{ perspective: 700, width: size, height: size }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", animation: spin }}
          >
            {[
              { t: `translateZ(${size / 2}px)`, pips: 1 },
              { t: `rotateY(180deg) translateZ(${size / 2}px)`, pips: 6 },
              { t: `rotateY(90deg) translateZ(${size / 2}px)`, pips: 3 },
              { t: `rotateY(-90deg) translateZ(${size / 2}px)`, pips: 4 },
              { t: `rotateX(90deg) translateZ(${size / 2}px)`, pips: 2 },
              { t: `rotateX(-90deg) translateZ(${size / 2}px)`, pips: 5 },
            ].map((f, i) => (
              <div
                key={i}
                className="absolute inset-0 grid place-items-center rounded-3xl border-2 border-border"
                style={{
                  transform: f.t,
                  backgroundImage:
                    "linear-gradient(145deg, oklch(0.99 0.02 80), oklch(0.92 0.05 60))",
                  boxShadow:
                    "inset 0 -10px 18px oklch(0.7 0.06 40 / 0.35), inset 0 10px 14px oklch(1 0 0 / 0.8)",
                }}
              >
                <Pips n={f.pips} size={size} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {phase === "rolling" && (
        <div
          className="panel absolute -bottom-2 px-4 py-1 font-display text-lg font-extrabold"
          aria-live="polite"
        >
          {label}
        </div>
      )}
    </div>
  );
}

function Pips({ n, size }: { n: number; size: number }) {
  const grid: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const on = new Set(grid[n] ?? []);
  return (
    <div className="grid grid-cols-3 gap-1" style={{ width: size * 0.62, height: size * 0.62 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            background: on.has(i)
              ? "radial-gradient(circle at 35% 30%, oklch(0.75 0.2 15), oklch(0.5 0.18 15))"
              : "transparent",
            boxShadow: on.has(i) ? "inset 0 -2px 3px oklch(0.3 0.1 15 / .5)" : "none",
          }}
        />
      ))}
    </div>
  );
}
