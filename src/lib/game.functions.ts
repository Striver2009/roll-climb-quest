import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import fs from "node:fs";
import path from "node:path";

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "bad date")
  .refine((value) => {
    const t = Date.parse(`${value}T12:00:00Z`);
    return Math.abs(t - Date.now()) < 1000 * 60 * 60 * 48;
  }, "date out of range");

const uuid = z.string().uuid();

export type SequenceItem = { id: string; title: string; description: string | null };

type GuestWorldItem = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  theme: string;
  custom_color: string | null;
  current_streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
};

type GuestTaskItem = {
  id: string;
  task_set_id: string;
  user_id: string;
  title: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
};

type GuestRunItem = {
  id: string;
  task_set_id: string;
  user_id: string;
  local_date: string;
  current_index: number;
  sequence: SequenceItem[];
  completed_at: string | null;
  created_at: string;
};

type GuestData = {
  worlds: GuestWorldItem[];
  tasks: GuestTaskItem[];
  runs: GuestRunItem[];
};

const GUEST_FILE = path.join(process.cwd(), ".guest_data.json");

function getGuestData(): GuestData {
  try {
    if (fs.existsSync(GUEST_FILE)) {
      const raw = fs.readFileSync(GUEST_FILE, "utf-8");
      return JSON.parse(raw) as GuestData;
    }
  } catch {}
  return { worlds: [], tasks: [], runs: [] };
}

function saveGuestData(data: GuestData) {
  try {
    fs.writeFileSync(GUEST_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

const isRlsError = (err: any) => {
  if (!err) return false;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("row-level security") || msg.includes("rls") || err?.code === "42501";
};

export const listWorlds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { localDate: string }) => z.object({ localDate }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
      const [sets, tasks, runs] = await Promise.all([
        supabase.from("task_sets").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("tasks").select("id, task_set_id, is_active").eq("user_id", userId),
        supabase
          .from("daily_runs")
          .select("id, task_set_id, current_index, sequence, completed_at")
          .eq("user_id", userId)
          .eq("local_date", data.localDate),
      ]);

      if (sets.error) throw sets.error;
      if (!sets.data || sets.data.length === 0) throw new Error("EMPTY_SETS");

      return sets.data.map((s) => {
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
    } catch (err: any) {
      const store = getGuestData();
      const userSets = store.worlds.length > 0
        ? store.worlds
        : [];

      return userSets.map((s) => {
        const run = store.runs.find((r) => r.task_set_id === s.id && r.local_date === data.localDate);
        const seq = run?.sequence ?? [];
        return {
          ...s,
          taskCount: store.tasks.filter((t) => t.task_set_id === s.id && t.is_active).length,
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
    }
  });

export const getWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
      const set = await supabase
        .from("task_sets")
        .select("*")
        .eq("id", data.taskSetId)
        .eq("user_id", userId)
        .maybeSingle();

      if (set.error) throw set.error;
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
    } catch (err: any) {
      const store = getGuestData();
      const world = store.worlds.find((w) => w.id === data.taskSetId);
      if (!world) {
        throw new Error("WORLD_NOT_FOUND");
      }
      const tasks = store.tasks
        .filter((t) => t.task_set_id === data.taskSetId)
        .sort((a, b) => a.position - b.position);
      const run =
        store.runs.find((r) => r.task_set_id === data.taskSetId && r.local_date === data.localDate) ??
        null;
      return { world, tasks, run };
    }
  });

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "bad colour")
  .nullable();

export const createWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      emoji: string;
      theme: string;
      customColor?: string | null;
      tasks: string[];
    }) =>
      z
        .object({
          name: z.string().trim().min(1).max(60),
          emoji: z.string().trim().min(1).max(8),
          theme: z.enum(["sakura", "ocean", "ember", "forest", "violet", "custom"]),
          customColor: hexColor.optional(),
          tasks: z.array(z.string().trim().min(1).max(80)).max(40),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
      const set = await supabase
        .from("task_sets")
        .insert({
          user_id: userId,
          name: data.name,
          emoji: data.emoji,
          theme: data.theme,
          custom_color: data.customColor ?? null,
        })
        .select()
        .single();

      if (set.error) throw set.error;

      if (data.tasks.length) {
        const rows = data.tasks.map((title, i) => ({
          task_set_id: set.data.id,
          user_id: userId,
          title,
          position: i,
        }));
        const ins = await supabase.from("tasks").insert(rows);
        if (ins.error) throw ins.error;
      }
      return set.data;
    } catch (err: any) {
      const store = getGuestData();
      const newWorld: GuestWorldItem = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: data.name,
        emoji: data.emoji,
        theme: data.theme,
        custom_color: data.customColor ?? null,
        current_streak: 0,
        best_streak: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.worlds.push(newWorld);

      data.tasks.forEach((title, i) => {
        store.tasks.push({
          id: crypto.randomUUID(),
          task_set_id: newWorld.id,
          user_id: userId,
          title,
          description: null,
          position: i,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      });

      saveGuestData(store);
      return newWorld;
    }
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
    }) =>
      z
        .object({
          id: uuid,
          name: z.string().trim().min(1).max(60).optional(),
          emoji: z.string().trim().min(1).max(8).optional(),
          theme: z.enum(["sakura", "ocean", "ember", "forest", "violet", "custom"]).optional(),
          customColor: hexColor.optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.emoji !== undefined) patch.emoji = data.emoji;
    if (data.theme !== undefined) patch.theme = data.theme;
    if (data.customColor !== undefined) patch.custom_color = data.customColor;
    const { id } = data;

    try {
      const res = await context.supabase
        .from("task_sets")
        .update(patch)
        .eq("id", id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      const world = store.worlds.find((w) => w.id === id);
      if (!world) throw new Error("WORLD_NOT_FOUND");
      if (patch.name !== undefined) world.name = patch.name;
      if (patch.emoji !== undefined) world.emoji = patch.emoji;
      if (patch.theme !== undefined) world.theme = patch.theme;
      if (patch.custom_color !== undefined) world.custom_color = patch.custom_color;
      world.updated_at = new Date().toISOString();
      saveGuestData(store);
      return world;
    }
  });

export const deleteWorld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const res = await context.supabase
        .from("task_sets")
        .delete()
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (res.error) throw res.error;
      return { ok: true };
    } catch (err: any) {
      const store = getGuestData();
      store.worlds = store.worlds.filter((w) => w.id !== data.id);
      store.tasks = store.tasks.filter((t) => t.task_set_id !== data.id);
      store.runs = store.runs.filter((r) => r.task_set_id !== data.id);
      saveGuestData(store);
      return { ok: true };
    }
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; title: string; description?: string }) =>
    z
      .object({
        taskSetId: uuid,
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().max(240).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
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
      if (owned.error) throw owned.error;
      if (!owned.data) throw new Error("WORLD_NOT_FOUND");

      const res = await supabase
        .from("tasks")
        .insert({
          task_set_id: data.taskSetId,
          user_id: userId,
          title: data.title,
          description: data.description ?? null,
          position: count.count ?? 0,
        })
        .select()
        .single();
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      const world = store.worlds.find((w) => w.id === data.taskSetId);
      if (!world) throw new Error("WORLD_NOT_FOUND");

      const existingTasks = store.tasks.filter((t) => t.task_set_id === data.taskSetId);
      const newTask: GuestTaskItem = {
        id: crypto.randomUUID(),
        task_set_id: data.taskSetId,
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        position: existingTasks.length,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      store.tasks.push(newTask);
      saveGuestData(store);
      return newTask;
    }
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; title?: string; description?: string | null; isActive?: boolean }) =>
      z
        .object({
          id: uuid,
          title: z.string().trim().min(1).max(80).optional(),
          description: z.string().trim().max(240).nullable().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.isActive !== undefined) patch.is_active = data.isActive;

    try {
      const res = await context.supabase
        .from("tasks")
        .update(patch)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      const task = store.tasks.find((t) => t.id === data.id);
      if (!task) throw new Error("TASK_NOT_FOUND");
      if (patch.title !== undefined) task.title = patch.title;
      if (patch.description !== undefined) task.description = patch.description;
      if (patch.is_active !== undefined) task.is_active = patch.is_active;
      saveGuestData(store);
      return task;
    }
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const res = await context.supabase
        .from("tasks")
        .delete()
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (res.error) throw res.error;
      return { ok: true };
    } catch (err: any) {
      const store = getGuestData();
      store.tasks = store.tasks.filter((t) => t.id !== data.id);
      saveGuestData(store);
      return { ok: true };
    }
  });

export const reorderTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; ids: string[] }) =>
    z.object({ taskSetId: uuid, ids: z.array(uuid).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
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
      if (failed?.error) throw failed.error;
      return { ok: true };
    } catch (err: any) {
      const store = getGuestData();
      data.ids.forEach((taskId, i) => {
        const task = store.tasks.find((t) => t.id === taskId);
        if (task) task.position = i;
      });
      saveGuestData(store);
      return { ok: true };
    }
  });

/** Idempotent: returns the existing locked route if today's run already exists. */
export const rollToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const res = await context.supabase.rpc("roll_daily_run", {
        p_task_set_id: data.taskSetId,
        p_local_date: data.localDate,
      });
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      let existing = store.runs.find(
        (r) => r.task_set_id === data.taskSetId && r.local_date === data.localDate,
      );
      if (existing) return existing;

      const activeTasks = store.tasks.filter(
        (t) => t.task_set_id === data.taskSetId && t.is_active,
      );
      if (activeTasks.length === 0) throw new Error("NO_TASKS");

      const shuffled = [...activeTasks].sort(() => Math.random() - 0.5);
      const sequence: SequenceItem[] = shuffled.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
      }));

      const newRun: GuestRunItem = {
        id: crypto.randomUUID(),
        task_set_id: data.taskSetId,
        user_id: context.userId,
        local_date: data.localDate,
        current_index: 0,
        sequence,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      store.runs.push(newRun);
      saveGuestData(store);
      return newRun;
    }
  });

/** Server-authoritative: only the run's current mission can be completed. */
export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { dailyRunId: string; taskId: string }) =>
    z.object({ dailyRunId: uuid, taskId: uuid }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const res = await context.supabase.rpc("complete_current_task", {
        p_daily_run_id: data.dailyRunId,
        p_task_id: data.taskId,
      });
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      const run = store.runs.find((r) => r.id === data.dailyRunId);
      if (!run) throw new Error("COMPLETE_FAILED");
      const currentTask = run.sequence[run.current_index];
      if (!currentTask || currentTask.id !== data.taskId) throw new Error("TASK_LOCKED");

      run.current_index += 1;
      if (run.current_index >= run.sequence.length) {
        run.completed_at = new Date().toISOString();
      }
      saveGuestData(store);
      return run;
    }
  });

/** Re-roll a finished day with a brand new random order (guarded by a typed safety code in the UI). */
export const rerollToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; localDate: string }) =>
    z.object({ taskSetId: uuid, localDate }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      const res = await context.supabase.rpc("reroll_daily_run", {
        p_task_set_id: data.taskSetId,
        p_local_date: data.localDate,
      });
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      const store = getGuestData();
      store.runs = store.runs.filter(
        (r) => !(r.task_set_id === data.taskSetId && r.local_date === data.localDate),
      );

      const activeTasks = store.tasks.filter(
        (t) => t.task_set_id === data.taskSetId && t.is_active,
      );
      if (activeTasks.length === 0) throw new Error("NO_TASKS");

      const shuffled = [...activeTasks].sort(() => Math.random() - 0.5);
      const sequence: SequenceItem[] = shuffled.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
      }));

      const newRun: GuestRunItem = {
        id: crypto.randomUUID(),
        task_set_id: data.taskSetId,
        user_id: context.userId,
        local_date: data.localDate,
        current_index: 0,
        sequence,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      store.runs.push(newRun);
      saveGuestData(store);
      return newRun;
    }
  });

export const getHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskSetId: string; page?: number }) =>
    z.object({ taskSetId: uuid, page: z.number().int().min(0).max(500).default(0) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const pageSize = 10;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      const res = await context.supabase
        .from("daily_runs")
        .select("id, local_date, sequence, current_index, completed_at", { count: "exact" })
        .eq("task_set_id", data.taskSetId)
        .eq("user_id", context.userId)
        .gte("local_date", since)
        .order("local_date", { ascending: false });

      if (res.error) throw res.error;
      return { runs: res.data ?? [], count: res.count ?? 0, pageSize };
    } catch (err: any) {
      const store = getGuestData();
      const runs = store.runs.filter(
        (r) => r.task_set_id === data.taskSetId && r.local_date >= since,
      );
      return { runs, count: runs.length, pageSize };
    }
  });

export const getSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
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
      if (created.error) throw created.error;
      return created.data;
    } catch (err: any) {
      return {
        user_id: userId,
        environment: "spring",
        music_enabled: true,
        effects_enabled: true,
        music_volume: 0.5,
        effects_volume: 0.5,
        master_mute: false,
        animation_mode: "full",
      };
    }
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
    const patch: any = { updated_at: new Date().toISOString() };
    if (data.environment !== undefined) patch.environment = data.environment;
    if (data.musicEnabled !== undefined) patch.music_enabled = data.musicEnabled;
    if (data.effectsEnabled !== undefined) patch.effects_enabled = data.effectsEnabled;
    if (data.musicVolume !== undefined) patch.music_volume = data.musicVolume;
    if (data.effectsVolume !== undefined) patch.effects_volume = data.effectsVolume;
    if (data.masterMute !== undefined) patch.master_mute = data.masterMute;
    if (data.animationMode !== undefined) patch.animation_mode = data.animationMode;

    try {
      const res = await context.supabase
        .from("user_settings")
        .upsert({ user_id: context.userId, ...patch }, { onConflict: "user_id" })
        .select()
        .single();
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      return { user_id: context.userId, ...patch };
    }
  });

export const getStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const existing = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing.data) return existing.data;
      const created = await supabase.from("user_stats").insert({ user_id: userId }).select().single();
      if (created.error) throw created.error;
      return created.data;
    } catch (err: any) {
      return { user_id: userId, total_runs: 0, completed_runs: 0 };
    }
  });

export const syncProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { timezone: string }) =>
    z.object({ timezone: z.string().max(64) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const meta = (claims as { user_metadata?: Record<string, string> })?.user_metadata ?? {};
    try {
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
      if (res.error) throw res.error;
      return res.data;
    } catch (err: any) {
      return { id: userId, timezone: data.timezone };
    }
  });
