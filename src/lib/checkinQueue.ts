/** Native persistent camp queue. Guest entries retain their staff identity and
 * retry key; storage changes are serialized to preserve concurrent offline saves. */
import { checkInNativeToken } from './nativeCampCheckin';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";
import { savedGuestStaff, recoverNativeGuest, saveNativeGuest } from "./nativeCampGuest";

const STORAGE_KEY = "camp_checkin_queue";

export type QueuedOpKind =
  | "qr_check_in"
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
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(entry => !entry || typeof entry !== 'object')) throw new Error('Invalid queue');
    return parsed as QueuedOp[];
  } catch {
    throw new Error('Saved camp entries could not be read. Existing entries were kept.');
  }
}

async function writeAll(ops: QueuedOp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

let storageWrites: Promise<void> = Promise.resolve();
function changeQueue(transform: (entries: QueuedOp[]) => QueuedOp[]): Promise<void> {
  const write = storageWrites.then(async () => writeAll(transform(await readAll())));
  storageWrites = write.catch(() => {});
  return write;
}
let flushActive = false;

export async function enqueueOp(op: Omit<QueuedOp, "id" | "createdAt" | "attempts">) {
  const full: QueuedOp = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  await changeQueue(entries => [...entries, full]);
  return full;
}

export async function listQueue(campId?: string, staffId?: string): Promise<QueuedOp[]> {
  await storageWrites;
  const all = await readAll();
  return all.filter(entry => (!campId || entry.campId === campId) &&
    ((entry.kind !== "walkup_register" && entry.kind !== "qr_check_in") || (!!staffId && (entry.kind === "qr_check_in" ? entry.payload.staffId : savedGuestStaff(entry.payload)) === staffId)));
}

export async function removeOp(id: string) {
  await changeQueue(entries => entries.filter(entry => entry.id !== id));
}

async function executeOp(op: QueuedOp): Promise<void> {
  if (op.kind === "qr_check_in") { await checkInNativeToken(op.campId, op.payload.token, op.payload.staffId); return; }
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
    await saveNativeGuest(op.campId, recoverNativeGuest(op.payload, op.id));
    return;
  }

  throw new Error(`Unknown op kind: ${(op as any).kind}`);
}

export interface FlushResult {
  flushed: number;
  failed: number;
}

export async function flushQueue(campId: string | undefined, staffId: string): Promise<FlushResult> {
  if (flushActive || !staffId) return { flushed: 0, failed: 0 };
  flushActive = true;
  try {
  const ops = await listQueue(campId, staffId);
  let flushed = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      await executeOp(op);
      // remove the just-flushed op (re-read each time to avoid clobbering concurrent writes)
      await changeQueue(entries => entries.filter(entry => entry.id !== op.id));
      flushed++;
    } catch (err: any) {
      failed++;
      // bump attempts so user can see the failure persists
      await changeQueue(entries => entries.map((o) =>
        o.id === op.id
          ? { ...o, attempts: o.attempts + 1, lastError: err?.message ?? String(err) }
          : o,
      ));
    }
  }
  return { flushed, failed };
  } finally { flushActive = false; }
}
