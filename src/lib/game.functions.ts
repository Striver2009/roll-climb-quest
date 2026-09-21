import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "bad date")
  .refine((value) => {
    // Guard against absurd client dates: must be within 2 days of UTC "now".
    const t = Date.parse(`${value}T12:00:00Z`);
    return Math.abs(t - Date.now()) < 1000 * 60 * 60 * 48;
  }, "date out of range");

const uuid = z.string().uuid();

export type SequenceItem = { id: string; title: string; description: string | null };

export const listWorlds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { localDate: string }) => z.object({ localDate }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [sets, tasks, runs] = await Promise.all([
      supabase.from("task_sets").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("tasks").select("id, task_set_id, is_active").eq("user_id", userId),
      supabase
        .from("daily_runs")
        .select("id, task_set_id, current_index, sequence, completed_at")
        .eq("user_id", userId)
        .eq("local_date", data.localDate),
    ]);
    if (sets.error) throw new Error(sets.error.message);

    return (sets.data ?? []).map((s) => {
      const run = (runs.data ?? []).find((r) => r.task_set_id === s.id);
      const seq = (run?.sequence as SequenceItem[] | undefined) ?? [];
      return {
        ...s,
        taskCount: (tasks.data ?? []).filter((t) => t.task_set_id === s.id && t.is_active).length,
        run: run
          ? {
              id: run.id,
              total: seq.length,
              currentIndex: run.current_index,
              complete: Boolean(run.completed_at),
            }
          : null,
      };
    });
  });

export const getWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const set = await supabase
      .from("task_sets")
      .select("*")
      .eq("id", data.taskSetId)
      .eq("user_id", userId)
      .maybeSingle();
    if (set.error) throw new Error(set.error.message);
    if (!set.data) throw new Error("WORLD_NOT_FOUND");

    const [tasks, run] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("task_set_id", data.taskSetId)
        .eq("user_id", userId)
        .order("position"),
      supabase
        .from("daily_runs")
        .select("*")
        .eq("task_set_id", data.taskSetId)
        .eq("user_id", userId)
        .eq("local_date", data.localDate)
        .maybeSingle(),
    ]);

    return { world: set.data, tasks: tasks.data ?? [], run: run.data ?? null };
  });

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "bad colour")
  .nullable();

const emojiField = z.string().trim().min(1).max(16);

export const listFolders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await context.supabase
      .from("world_folders")
      .select("*")
      .eq("user_id", context.userId)
      .order("position")
      .order("created_at");
    if (res.error) throw new Error(res.error.message);
    return res.data ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; emoji: string; color?: string | null }) =>
    z
      .object({
        name: z.string().trim().min(1).max(40),
        emoji: emojiField,
        color: hexColor.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const count = await supabase
      .from("world_folders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const res = await supabase
      .from("world_folders")
      .insert({
        user_id: userId,
        name: data.name,
        emoji: data.emoji,
        color: data.color ?? null,
        position: count.count ?? 0,
      })
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const updateFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; name?: string; emoji?: string; color?: string | null }) =>
    z
      .object({
        id: uuid,
        name: z.string().trim().min(1).max(40).optional(),
        emoji: emojiField.optional(),
        color: hexColor.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: { name?: string; emoji?: string; color?: string | null } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.emoji !== undefined) patch.emoji = data.emoji;
    if (data.color !== undefined) patch.color = data.color;
    const res = await context.supabase
      .from("world_folders")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("world_folders")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const moveWorldToFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; folderId: string | null }) =>
    z.object({ id: uuid, folderId: uuid.nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("task_sets")
      .update({ folder_id: data.folderId })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const createWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      emoji: string;
      theme: string;
      customColor?: string | null;
      folderId?: string | null;
      tasks: string[];
    }) =>
      z
        .object({
          name: z.string().trim().min(1).max(60),
          emoji: emojiField,
          theme: z.enum(["sakura", "ocean", "ember", "forest", "violet", "custom"]),
          customColor: hexColor.optional(),
          folderId: uuid.nullable().optional(),
          tasks: z.array(z.string().trim().min(1).max(80)).max(40),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const set = await supabase
      .from("task_sets")
      .insert({
        user_id: userId,
        name: data.name,
        emoji: data.emoji,
        theme: data.theme,
        custom_color: data.customColor ?? null,
        folder_id: data.folderId ?? null,
      })
      .select()
      .single();
    if (set.error) throw new Error(set.error.message);

    if (data.tasks.length) {
      const rows = data.tasks.map((title, i) => ({
        task_set_id: set.data.id,
        user_id: userId,
        title,
        position: i,
      }));
      const ins = await supabase.from("tasks").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return set.data;
  });

export const updateWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      name?: string;
      emoji?: string;
      theme?: string;
      customColor?: string | null;
      folderId?: string | null;
    }) =>
      z
        .object({
          id: uuid,
          name: z.string().trim().min(1).max(60).optional(),
          emoji: emojiField.optional(),
          theme: z.enum(["sakura", "ocean", "ember", "forest", "violet", "custom"]).optional(),
          customColor: hexColor.optional(),
          folderId: uuid.nullable().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      name?: string;
      emoji?: string;
      theme?: string;
      custom_color?: string | null;
      folder_id?: string | null;
    } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.emoji !== undefined) patch.emoji = data.emoji;
    if (data.theme !== undefined) patch.theme = data.theme;
    if (data.customColor !== undefined) patch.custom_color = data.customColor;
    if (data.folderId !== undefined) patch.folder_id = data.folderId;
    const { id } = data;
    const res = await context.supabase
      .from("task_sets")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });



export const deleteWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("task_sets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      taskSetId: string;
      title: string;
      description?: string;
      days?: number[];
      priority?: number;
    }) =>
      z
        .object({
          taskSetId: uuid,
          title: z.string().trim().min(1).max(80),
          description: z.string().trim().max(240).optional(),
          days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
          priority: z.number().int().min(0).max(2).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [owned, count] = await Promise.all([
      supabase
        .from("task_sets")
        .select("id")
        .eq("id", data.taskSetId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("task_set_id", data.taskSetId),
    ]);
    if (!owned.data) throw new Error("WORLD_NOT_FOUND");


    const res = await supabase
      .from("tasks")
      .insert({
        task_set_id: data.taskSetId,
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        position: count.count ?? 0,
        days: data.days ?? [],
        priority: data.priority ?? 1,
      })
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      title?: string;
      description?: string | null;
      isActive?: boolean;
      days?: number[];
      priority?: number;
    }) =>
      z
        .object({
          id: uuid,
          title: z.string().trim().min(1).max(80).optional(),
          description: z.string().trim().max(240).nullable().optional(),
          isActive: z.boolean().optional(),
          days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
          priority: z.number().int().min(0).max(2).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      title?: string;
      description?: string | null;
      is_active?: boolean;
      days?: number[];
      priority?: number;
    } = {};
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.days !== undefined) patch.days = [...new Set(data.days)].sort();
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const res = await context.supabase
      .from("tasks")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("tasks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const reorderTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; ids: string[] }) =>
    z.object({ taskSetId: uuid, ids: z.array(uuid).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const results = await Promise.all(
      data.ids.map((taskId, i) =>
        supabase
          .from("tasks")
          .update({ position: i })
          .eq("id", taskId)
          .eq("task_set_id", data.taskSetId)
          .eq("user_id", userId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

    return { ok: true };
  });

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Idempotent: returns the existing locked route if today's run already exists. */
export const rollToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Smart order (opt-in per world): ask the planner first, then let the
    // database validate and lock it. Any hiccup falls back to the dice.
    const set = await supabase
      .from("task_sets")
      .select("name, ai_order")
      .eq("id", data.taskSetId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (set.data?.ai_order) {
      const smart = await smartRoll(context, data, set.data.name);
      if (smart) return smart;
    }

    const res = await supabase.rpc("roll_daily_run", {
      p_task_set_id: data.taskSetId,
      p_local_date: data.localDate,
    });
    if (res.error) {
      if (res.error.message.includes("no active tasks")) throw new Error("NO_TASKS");
      throw new Error("ROLL_FAILED");
    }
    return res.data;
  });

async function smartRoll(
  context: { supabase: any; userId: string },
  data: { taskSetId: string; localDate: string },
  worldName: string,
) {
  try {
    const { supabase, userId } = context;
    const dow = new Date(`${data.localDate}T12:00:00Z`).getUTCDay();

    const [tasksRes, histRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, description, priority, days")
        .eq("task_set_id", data.taskSetId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("position"),
      supabase
        .from("daily_runs")
        .select("sequence")
        .eq("task_set_id", data.taskSetId)
        .eq("user_id", userId)
        .lt("local_date", data.localDate)
        .order("local_date", { ascending: false })
        .limit(7),
    ]);

    const eligible = (tasksRes.data ?? []).filter(
      (t: { days: number[] | null }) => !t.days || t.days.length === 0 || t.days.includes(dow),
    );
    if (eligible.length < 2) return null;

    const history = (histRes.data ?? []).map(
      (r: { sequence: Array<{ id: string }> | null }) => r.sequence ?? [],
    );

    const { planMissionOrder } = await import("@/lib/ai-plan.server");
    const plan = await planMissionOrder({
      worldName,
      weekday: WEEKDAYS[dow] ?? "today",
      tasks: eligible.map(
        (t: { id: string; title: string; description: string | null; priority: number }) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority ?? 1,
          recentlyFirst: history.filter((s: Array<{ id: string }>) => s[0]?.id === t.id).length,
          recentlyLast: history.filter(
            (s: Array<{ id: string }>) => s.length > 0 && s[s.length - 1]?.id === t.id,
          ).length,
        }),
      ),
    });
    if (!plan) return null;

    const res = await supabase.rpc("roll_daily_run_ai", {
      p_task_set_id: data.taskSetId,
      p_local_date: data.localDate,
      p_order: plan.order,
      p_reason: plan.reason,
    });
    if (res.error) return null;
    return res.data;
  } catch {
    return null;
  }
}


/**
 * Restart today's adventure: progress resets to the first checkpoint while the
 * dice-locked order stays exactly the same until local midnight.
 */
export const restartToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const res = await context.supabase.rpc("restart_daily_run", {
      p_task_set_id: data.taskSetId,
      p_local_date: data.localDate,
    });
    if (res.error) {
      if (res.error.message.includes("run not found")) throw new Error("NO_RUN");
      throw new Error("RESTART_FAILED");
    }
    return res.data;
  });



/** Server-authoritative: only the run's current mission can be completed. */
export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { dailyRunId: string; taskId: string }) =>
    z.object({ dailyRunId: uuid, taskId: uuid }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const res = await context.supabase.rpc("complete_current_task", {
      p_daily_run_id: data.dailyRunId,
      p_task_id: data.taskId,
    });
    if (res.error) {
      if (res.error.message.includes("TASK LOCKED")) throw new Error("TASK_LOCKED");
      if (res.error.message.includes("already complete")) throw new Error("ALREADY_COMPLETE");
      throw new Error("COMPLETE_FAILED");
    }
    return res.data;
  });

export const getHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; page?: number }) =>
    z.object({ taskSetId: uuid, page: z.number().int().min(0).max(500).default(0) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const pageSize = 10;
    const from = data.page * pageSize;
    const res = await context.supabase
      .from("daily_runs")
      .select("id, local_date, sequence, current_index, completed_at", { count: "exact" })
      .eq("task_set_id", data.taskSetId)
      .eq("user_id", context.userId)
      .order("local_date", { ascending: false })
      .range(from, from + pageSize - 1);
    if (res.error) throw new Error(res.error.message);
    return { runs: res.data ?? [], count: res.count ?? 0, pageSize };
  });

export const getSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing.data) return existing.data;
    const created = await supabase
      .from("user_settings")
      .insert({ user_id: userId })
      .select()
      .single();
    if (created.error) throw new Error(created.error.message);
    return created.data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      environment?: string;
      musicEnabled?: boolean;
      effectsEnabled?: boolean;
      musicVolume?: number;
      effectsVolume?: number;
      masterMute?: boolean;
      animationMode?: string;
    }) =>
      z
        .object({
          environment: z
            .enum(["spring", "snow", "rain", "mist", "sunset", "night", "petalstorm"])
            .optional(),
          musicEnabled: z.boolean().optional(),
          effectsEnabled: z.boolean().optional(),
          musicVolume: z.number().min(0).max(1).optional(),
          effectsVolume: z.number().min(0).max(1).optional(),
          masterMute: z.boolean().optional(),
          animationMode: z.enum(["full", "reduced", "off"]).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      updated_at: string;
      environment?: string;
      music_enabled?: boolean;
      effects_enabled?: boolean;
      music_volume?: number;
      effects_volume?: number;
      master_mute?: boolean;
      animation_mode?: string;
    } = { updated_at: new Date().toISOString() };
    if (data.environment !== undefined) patch.environment = data.environment;
    if (data.musicEnabled !== undefined) patch.music_enabled = data.musicEnabled;
    if (data.effectsEnabled !== undefined) patch.effects_enabled = data.effectsEnabled;
    if (data.musicVolume !== undefined) patch.music_volume = data.musicVolume;
    if (data.effectsVolume !== undefined) patch.effects_volume = data.effectsVolume;
    if (data.masterMute !== undefined) patch.master_mute = data.masterMute;
    if (data.animationMode !== undefined) patch.animation_mode = data.animationMode;

    const res = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, ...patch }, { onConflict: "user_id" })
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const getStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing.data) return existing.data;
    const created = await supabase.from("user_stats").insert({ user_id: userId }).select().single();
    if (created.error) throw new Error(created.error.message);
    return created.data;
  });

export const syncProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { timezone: string }) =>
    z.object({ timezone: z.string().max(64) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const meta = (claims as { user_metadata?: Record<string, string> })?.user_metadata ?? {};
    const res = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          name: meta['full_name'] ?? meta['name'] ?? null,
          email: (claims as { email?: string })?.email ?? null,
          avatar_url: meta['avatar_url'] ?? null,
          timezone: data.timezone,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });
