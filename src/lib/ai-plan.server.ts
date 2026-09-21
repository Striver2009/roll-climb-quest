/**
 * Smart mission planner (Lovable AI).
 *
 * Given today's eligible missions, it proposes the order that should give the
 * best study day: importance first, then cognitive load, momentum and recent
 * history. It NEVER decides what is allowed — the database validates the order
 * is an exact permutation of today's missions before locking it.
 */

type PlanTask = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  recentlyFirst: number;
  recentlyLast: number;
};

export type PlanResult = { order: string[]; reason: string } | null;

const PRIORITY_LABEL: Record<number, string> = { 2: "most important", 1: "medium", 0: "least" };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    order: {
      type: "array",
      description: "Every mission number, exactly once, in the order to study them.",
      items: { type: "integer" },
    },
    reason: {
      type: "string",
      description: "One short friendly sentence (max 160 chars) explaining the order.",
    },
  },
  required: ["order", "reason"],
} as const;

export async function planMissionOrder(args: {
  worldName: string;
  weekday: string;
  tasks: PlanTask[];
}): Promise<PlanResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || args.tasks.length < 2) return null;

  const lines = args.tasks.map(
    (t, i) =>
      `${i + 1}. ${t.title}${t.description ? ` — ${t.description}` : ""} [importance: ${
        PRIORITY_LABEL[t.priority] ?? "medium"
      }; started the day ${t.recentlyFirst} of the last 7 days; ended the day ${t.recentlyLast} of the last 7 days]`,
  );

  const prompt = [
    `You are planning a student's study order for ${args.weekday} in their study world "${args.worldName}".`,
    "",
    "Missions:",
    ...lines,
    "",
    "Rules:",
    "- Hard rule: every 'most important' mission comes before every 'medium' one, and every 'medium' before every 'least' one.",
    "- Inside a group, order for a strong day: a quick confidence-building start, the heaviest thinking while energy is high, lighter revision or practice later.",
    "- Vary from recent days: avoid starting or ending with a mission that already opened or closed most of the last 7 days.",
    "- Use every mission number exactly once.",
    "Reply with the order and one short encouraging sentence explaining it.",
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: {
          format: { type: "json_schema", name: "mission_order", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok || !res.body) return null;

    // Responses API always streams; accumulate the answer text.
    const text = await readOutputText(res.body);
    if (!text) return null;

    const parsed = JSON.parse(text) as { order?: unknown; reason?: unknown };
    const idx = Array.isArray(parsed.order) ? parsed.order.map(Number) : [];
    const seen = new Set<number>();
    const order: string[] = [];
    for (const n of idx) {
      const task = args.tasks[n - 1];
      if (!task || seen.has(n)) continue;
      seen.add(n);
      order.push(task.id);
    }
    if (order.length !== args.tasks.length) return null;

    const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 300) : "";
    return { order, reason };
  } catch {
    return null;
  }
}

async function readOutputText(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            out += event.delta;
          } else if (event.type === "response.completed" && event.response?.output_text) {
            out = event.response.output_text;
          }
        } catch {
          /* partial event — ignore */
        }
      }
    }
  }
  return out.trim();
}
