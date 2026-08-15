export type Pt = { x: number; y: number };

/** Percent coordinates of each checkpoint along the winding trail (bottom → summit). */
export function checkpointPositions(n: number): Pt[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const y = 90 - t * 76;
    const x = 50 + Math.sin(t * 7.4 + 0.4) * 24 * (1 - t * 0.7);
    return { x, y };
  });
}

export const START_POINT: Pt = { x: 50, y: 95 };
export const SUMMIT_POINT: Pt = { x: 50, y: 9 };

/** Smooth SVG path (0-100 space) through start → checkpoints → summit. */
export function trailPath(points: Pt[]): string {
  const all = [START_POINT, ...points, SUMMIT_POINT];
  let d = `M ${all[0]!.x} ${all[0]!.y}`;
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1]!;
    const cur = all[i]!;
    const midY = (prev.y + cur.y) / 2;
    d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
  }
  return d;
}

export const CHECKPOINT_ICONS = ["🎯", "🧠", "⚛️", "📚", "📖", "🧪", "🧬", "✍️", "🔭", "💡"];
