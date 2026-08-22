import { memo, useMemo } from "react";
import mascotImg from "@/assets/mascot.png";
import { CHECKPOINT_ICONS, START_POINT, SUMMIT_POINT, checkpointPositions, trailPath } from "@/lib/mountain";
import { SKY_GRADIENTS, WeatherLayer, type EnvName } from "./WeatherLayer";
import type { SequenceItem } from "@/lib/game.functions";

type Props = {
  sequence: SequenceItem[];
  currentIndex: number;
  env: EnvName;
  motion: "full" | "reduced" | "off";
  overview: boolean;
  onCheckpointClick?: (index: number) => void;
};

function MountainSceneComponent({
  sequence,
  currentIndex,
  env,
  motion,
  overview,
  onCheckpointClick,
}: Props) {
  const points = useMemo(() => checkpointPositions(sequence.length), [sequence.length]);
  // Changes whenever the dice reshuffles the route → replays the draw-in animation.
  const routeKey = useMemo(() => sequence.map((s) => s.id).join("|"), [sequence]);
  const animate = motion === "full";
  const path = useMemo(() => trailPath(points), [points]);
  const done = currentIndex >= sequence.length;
  const mascot = done ? SUMMIT_POINT : (points[currentIndex] ?? START_POINT);

  const progress = sequence.length ? Math.min(currentIndex / sequence.length, 1) : 0;
  const camera = overview
    ? "translateY(0%) scale(1)"
    : `translateY(${progress * 12}%) scale(${1 + progress * 0.18})`;

  const nightish = env === "night";

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border-2 border-border"
      style={{ background: SKY_GRADIENTS[env], aspectRatio: "4 / 5", maxHeight: "78vh" }}
      role="img"
      aria-label={`Mountain route with ${sequence.length} checkpoints, ${currentIndex} completed`}
    >
      <WeatherLayer env={env} motion={motion} />

      <div
        className="mountain-camera absolute inset-0"
        style={{
          transform: camera,
          transformOrigin: "50% 100%",
          transition: motion === "off" ? "none" : "transform 700ms cubic-bezier(.35,1.1,.35,1)",
        }}
      >
        {/* mountain backdrop */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* far ridges */}
          <path d="M0 78 L18 56 L34 76 L48 60 L64 78 L80 58 L100 80 L100 100 L0 100 Z" fill="var(--color-peak)" opacity={nightish ? 0.5 : 0.35} />
          {/* main fictional fuji-like peak */}
          <path d="M50 6 L88 92 L12 92 Z" fill="var(--color-rock)" opacity={nightish ? 0.85 : 0.95} />
          <path d="M50 6 L64 38 Q57 33 50 39 Q43 33 36 38 Z" fill="var(--color-snow)" />
          <path d="M50 6 L60 28 Q54 25 50 30 Q46 25 40 28 Z" fill="var(--color-snow)" opacity="0.95" />
          {/* slope shading */}
          <path d="M50 6 L88 92 L50 92 Z" fill="oklch(0 0 0)" opacity="0.08" />
          {/* valley */}
          <path d="M0 88 Q25 80 50 88 Q75 96 100 86 L100 100 L0 100 Z" fill="var(--color-meadow)" opacity={nightish ? 0.6 : 0.95} />
          {/* lake */}
          <ellipse cx="20" cy="96" rx="16" ry="3.4" fill="var(--color-sky-deep)" opacity="0.55" />
          {/* clouds around upper mountain */}
          <g opacity={env === "mist" ? 0.85 : 0.6} fill="var(--color-snow)">
            <ellipse cx="32" cy="40" rx="16" ry="3.2" />
            <ellipse cx="70" cy="48" rx="18" ry="3.6" />
            <ellipse cx="52" cy="30" rx="12" ry="2.4" />
          </g>
        </svg>

        {/* winding trail */}
        <svg
          key={`trail-${routeKey}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d={path}
            fill="none"
            stroke="oklch(0.35 0.05 60 / 0.35)"
            strokeWidth="7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className={animate ? "anim-trail-draw" : undefined}
            style={animate ? { strokeDasharray: 400 } : undefined}
          />
          <path
            d={path}
            fill="none"
            stroke="var(--color-trail)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="1 6"
            vectorEffect="non-scaling-stroke"
            className={animate ? "anim-fade-in" : undefined}
            style={animate ? { animationDelay: "500ms" } : undefined}
          />
        </svg>

        {/* trees / rocks / huts decorations */}
        {DECOR.map((d, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute select-none"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              fontSize: `${d.s}px`,
              filter: nightish ? "brightness(0.65)" : "none",
              transform: "translate(-50%,-50%)",
            }}
          >
            {env === "snow" ? d.snow : d.emoji}
          </span>
        ))}

        {/* start marker */}
        <Marker x={START_POINT.x} y={START_POINT.y} label="START" tone="start" />

        {/* checkpoints */}
        {sequence.map((item, i) => {
          const p = points[i]!;
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "locked";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onCheckpointClick?.(i)}
              aria-current={state === "current" ? "step" : undefined}
              aria-label={`Checkpoint ${i + 1}: ${item.title} — ${
                state === "done" ? "completed" : state === "current" ? "current mission" : "locked"
              }`}
              className="absolute focus-visible:z-30"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                zIndex: state === "current" ? 20 : 10,
                transform: "translate(-50%,-50%)",
              }}
            >
              <span
                key={`cp-${routeKey}-${i}`}
                className={`relative flex flex-col items-center gap-1 ${animate ? "anim-cp-drop" : ""}`}
                style={animate ? ({ ["--cp-delay" as string]: `${i * 80}ms` }) : undefined}
              >
                {state === "current" && motion !== "off" && (
                  <span
                    aria-hidden
                    className="absolute -inset-3 rounded-full border-4 border-gold"
                    style={{ animation: "pulse-ring 1.8s ease-out infinite" }}
                  />
                )}
                <span
                  className="grid place-items-center rounded-full border-[3px] font-display text-base font-extrabold shadow-card sm:text-lg"
                  style={{
                    width: state === "current" ? 52 : 40,
                    height: state === "current" ? 52 : 40,
                    borderColor: state === "locked" ? "var(--color-locked)" : "var(--color-card)",
                    background:
                      state === "done"
                        ? "linear-gradient(145deg, var(--color-meadow), oklch(0.6 0.14 150))"
                        : state === "current"
                          ? "linear-gradient(145deg, var(--color-gold), oklch(0.75 0.17 60))"
                          : "var(--color-locked)",
                    color: "var(--color-card)",
                    filter: state === "locked" ? "saturate(0.4)" : "none",
                  }}
                >
                  {state === "done" ? "✓" : state === "locked" ? "🔒" : CHECKPOINT_ICONS[i % CHECKPOINT_ICONS.length]}
                </span>
                <span
                  className="panel max-w-[9rem] truncate px-2 py-[2px] text-[11px] font-bold sm:text-xs"
                  style={{ opacity: state === "locked" ? 0.75 : 1 }}
                >
                  {item.title}
                </span>
                {state === "current" && (
                  <span
                    aria-hidden
                    className="absolute -right-4 -top-5 text-lg"
                    style={{ animation: motion === "off" ? "none" : "flag-wave 1.4s ease-in-out infinite" }}
                  >
                    🚩
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* summit */}
        <Marker x={SUMMIT_POINT.x} y={SUMMIT_POINT.y} label={done ? "🏆 SUMMIT" : "SUMMIT"} tone={done ? "summit-done" : "summit"} />

        {/* mascot climbing */}
        <div
          className="absolute z-25"
          style={{
            left: `${mascot.x + 7}%`,
            top: `${mascot.y - 4}%`,
            width: "16%",
            maxWidth: 110,
            transform: "translate(-50%,-50%)",
            transition:
              motion === "off" ? "none" : "left 700ms cubic-bezier(.32,.9,.3,1), top 700ms cubic-bezier(.32,.9,.3,1)",
          }}
        >
          <img
            src={mascotImg}
            alt="Your explorer mascot"
            width={384}
            height={384}
            className={`block h-auto w-full ${motion === "off" ? "" : "anim-bob"}`}
          />
        </div>
      </div>
    </div>
  );
}

export const MountainScene = memo(MountainSceneComponent);

function Marker({
  x,
  y,
  label,
  tone,
}: {
  x: number;
  y: number;
  label: string;
  tone: "start" | "summit" | "summit-done";
}) {
  return (
    <div
      aria-hidden
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span
        className="panel px-2 py-[2px] font-display text-[11px] font-extrabold tracking-wide sm:text-xs"
        style={{
          boxShadow: tone === "summit-done" ? "var(--shadow-glow)" : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}

const DECOR = [
  { x: 12, y: 84, s: 30, emoji: "🌸", snow: "🌲" },
  { x: 26, y: 88, s: 26, emoji: "🌸", snow: "🌲" },
  { x: 78, y: 86, s: 30, emoji: "🌸", snow: "🌲" },
  { x: 88, y: 90, s: 24, emoji: "🌸", snow: "🌲" },
  { x: 62, y: 90, s: 22, emoji: "🌳", snow: "🌲" },
  { x: 36, y: 93, s: 22, emoji: "🏯", snow: "🏯" },
  { x: 70, y: 78, s: 20, emoji: "⛩️", snow: "⛩️" },
  { x: 22, y: 72, s: 18, emoji: "🏕️", snow: "🏕️" },
  { x: 80, y: 66, s: 16, emoji: "🪨", snow: "🪨" },
  { x: 30, y: 58, s: 16, emoji: "🏔️", snow: "🏔️" },
  { x: 66, y: 56, s: 15, emoji: "🌉", snow: "🌉" },
];
