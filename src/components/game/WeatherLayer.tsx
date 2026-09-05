import { memo, useMemo } from "react";

export type EnvName = "spring" | "snow" | "rain" | "mist" | "sunset" | "night" | "petalstorm";

export const ENVIRONMENTS: { id: EnvName; label: string; emoji: string }[] = [
  { id: "spring", label: "Spring", emoji: "🌸" },
  { id: "snow", label: "Snow", emoji: "❄️" },
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "mist", label: "Mist", emoji: "🌫️" },
  { id: "sunset", label: "Sunset", emoji: "🌅" },
  { id: "night", label: "Night", emoji: "🌌" },
  { id: "petalstorm", label: "Petal Storm", emoji: "🌸" },
];

export const SKY_GRADIENTS: Record<EnvName, string> = {
  spring: "linear-gradient(180deg, #bef1ff, #fff1cc 70%, #ffe0d7)",
  snow: "linear-gradient(180deg, #cce2ef, #eff6fb)",
  rain: "linear-gradient(180deg, #97a7b7, #c3cfda)",
  mist: "linear-gradient(180deg, #c3d0da, #e1eaec)",
  sunset:
    "linear-gradient(180deg, #9470cd, #ff9064 55%, #ffce79)",
  night: "linear-gradient(180deg, #0a183b, #2a4072)",
  petalstorm:
    "linear-gradient(180deg, #ffcccb, #ffdbf1 60%, #ffecd8)",
};

/** GPU-friendly particle layer — small, capped element counts. */
function WeatherLayerComponent({
  env,
  motion,
}: {
  env: EnvName;
  motion: "full" | "reduced" | "off";
}) {
  const count = motion === "off" ? 0 : motion === "reduced" ? 8 : env === "petalstorm" ? 28 : 18;

  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37 + ((i * i) % 23) * 4) % 100,
        delay: ((i * 13) % 90) / 10,
        dur: 6 + ((i * 7) % 60) / 10,
        size: 6 + ((i * 5) % 9),
        drift: ((i % 5) - 2) * 40,
        spin: 180 + ((i * 47) % 540),
      })),
    [count],
  );

  if (count === 0) return null;

  if (env === "rain") {
    return (
      <div aria-hidden className="weather-layer pointer-events-none absolute inset-0 overflow-hidden">
        {bits.map((b, i) => (
          <span
            key={i}
            className="absolute -top-10 block w-[2px] rounded bg-secondary"
            style={{
              left: `${b.left}%`,
              height: 18 + (i % 4) * 6,
              opacity: 0.55,
              ["--drift" as string]: "-20px",
              ["--spin" as string]: "0deg",
              animation: `fall ${1 + (i % 5) * 0.15}s linear ${b.delay / 4}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (env === "mist") {
    return (
      <div aria-hidden className="weather-layer pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: motion === "reduced" ? 2 : 4 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full"
            style={{
              top: `${18 + i * 12}%`,
              width: "60%",
              height: 90,
              background: "linear-gradient(90deg, transparent, var(--color-snow), transparent)",
              opacity: 0.38,
              animation: `drift-x ${28 + i * 6}s linear ${i * -6}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (env === "night") {
    return (
      <div aria-hidden className="weather-layer pointer-events-none absolute inset-0 overflow-hidden">
        {bits.map((b, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-snow"
            style={{
              left: `${b.left}%`,
              top: `${(i * 11) % 55}%`,
              width: 3,
              height: 3,
              animation: `twinkle ${2 + (i % 5) * 0.6}s ease-in-out ${b.delay / 3}s infinite`,
            }}
          />
        ))}
        <span
          className="absolute right-[12%] top-[10%] block h-16 w-16 rounded-full bg-snow"
          style={{ boxShadow: "0 0 50px 14px rgba(243, 250, 255, 0.45)" }}
        />
      </div>
    );
  }

  const snowy = env === "snow";
  return (
    <div aria-hidden className="weather-layer pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute -top-8 block"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: snowy ? b.size : b.size * 0.7,
            borderRadius: snowy ? "50%" : "60% 0 60% 0",
            background: snowy ? "var(--color-snow)" : "var(--color-sakura-deep)",
            opacity: snowy ? 0.9 : 0.85,
            ["--drift" as string]: `${b.drift}px`,
            ["--spin" as string]: `${b.spin}deg`,
            animation: `fall ${b.dur}s linear ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export const WeatherLayer = memo(WeatherLayerComponent);
