/**
 * Offline queue for camp check-in operations using AsyncStorage.
 * RN port of Lovable web src/lib/checkinQueue.ts (which used IndexedDB via `idb`).
 *
 * Operations are stored locally when offline and flushed to Supabase when the
 * device comes back online. Queue/dequeue/sync semantics match the web version
 * verbatim — only the storage layer was swapped from IndexedDB → AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "camp_checkin_queue";

export type QueuedOpKind =
  | "check_in" // mark enrollment checked_in
  | "walkup_register"; // create new enrollment + check in

export interface QueuedOp {
  id: string;
  kind: QueuedOpKind;
  campId: string;
  payload: Record<string, any>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

async function readAll(): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(ops: QueuedOp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export async function enqueueOp(op: Omit<QueuedOp, "id" | "createdAt" | "attempts">) {
  const all = await readAll();
  const full: QueuedOp = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  all.push(full);
  await writeAll(all);
  return full;
}

export async function listQueue(campId?: string): Promise<QueuedOp[]> {
  const all = await readAll();
  return campId ? all.filter((o) => o.campId === campId) : all;
}

export async function removeOp(id: string) {
  const all = await readAll();
  const next = all.filter((o) => o.id !== id);
  await writeAll(next);
}

async function executeOp(op: QueuedOp): Promise<void> {
  if (op.kind === "check_in") {
    const { enrollmentId } = op.payload;
    const { error } = await supabase
      .from("camp_enrollments")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
      } as any)
      .eq("id", enrollmentId);
    if (error) throw error;
    return;
  }

  if (op.kind === "walkup_register") {
    const { user_id, athlete_profile_id, jersey_number, position_group, notes } = op.payload;
    const { error } = await supabase.from("camp_enrollments").insert({
      camp_id: op.campId,
      user_id,
      athlete_profile_id: athlete_profile_id ?? null,
      jersey_number: jersey_number ?? null,
      position_group: position_group ?? null,
      notes: notes ?? null,
      status: "checked_in",
      payment_status: "walkup",
      checked_in_at: new Date().toISOString(),
    } as any);
    if (error) throw error;
    return;
  }

  throw new Error(`Unknown op kind: ${(op as any).kind}`);
}

export interface FlushResult {
  flushed: number;
  failed: number;
}

export async function flushQueue(campId?: string): Promise<FlushResult> {
  const ops = await listQueue(campId);
  let flushed = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      await executeOp(op);
      // remove the just-flushed op (re-read each time to avoid clobbering concurrent writes)
      const cur = await readAll();
      await writeAll(cur.filter((o) => o.id !== op.id));
      flushed++;
    } catch (err: any) {
      failed++;
      // bump attempts so user can see the failure persists
      const cur = await readAll();
      const next = cur.map((o) =>
        o.id === op.id
          ? { ...o, attempts: o.attempts + 1, lastError: err?.message ?? String(err) }
          : o,
      );
      await writeAll(next);
    }
  }
  return { flushed, failed };
}
