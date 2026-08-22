import { useEffect, useRef } from "react";

/** Lightweight canvas confetti — one canvas, no DOM spam. */
export function Confetti({ fire, motion }: { fire: number; motion: "full" | "reduced" | "off" }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!fire || motion === "off") return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#ff8a5c", "#ffd166", "#8ad6ff", "#a0e8af", "#ffb3d1"];
    const n = motion === "reduced" ? 30 : 80;
    const parts = Array.from({ length: n }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.5,
      y: h * 0.55 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 7,
      vy: -Math.random() * 9 - 3,
      r: 3 + Math.random() * 5,
      a: Math.random() * Math.PI,
      c: colors[Math.floor(Math.random() * colors.length)]!,
      life: 90 + Math.random() * 50,
    }));

    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of parts) {
        if (frame > p.life) continue;
        alive = true;
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.a += 0.15;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / p.life);
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        ctx.restore();
      }
      if (alive) raf.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    tick();

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [fire, motion]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-40 h-full w-full"
    />
  );
}
