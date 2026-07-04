/**
 * Cloud backup/restore utilities.
 * All failures are silent — the app works offline-first; cloud is best-effort.
 */

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : null;

export type BackupPayload = {
  subjects: unknown[];
  attendance: unknown[];
  assignments: unknown[];
  timetable: unknown[];
  habits: unknown[];
  habitLogs: unknown[];
  skills: unknown[];
  todos: unknown[];
};

/** Push all local data to the cloud. Returns true on success. */
export async function syncToCloud(
  email: string,
  passwordHash: string,
  data: BackupPayload,
): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const res = await fetch(`${API_BASE}/backup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passwordHash, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch a previous backup from the cloud. Returns null on failure or no backup. */
export async function restoreFromCloud(
  email: string,
  passwordHash: string,
): Promise<BackupPayload | null> {
  if (!API_BASE) return null;
  try {
    const params = new URLSearchParams({ email, passwordHash });
    const res = await fetch(`${API_BASE}/backup?${params}`);
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; data: BackupPayload };
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

// ── Debounce helper ───────────────────────────────────────────────────────────
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Schedule a cloud sync 4 seconds after the last call. */
export function scheduleSyncToCloud(
  email: string,
  passwordHash: string,
  getData: () => BackupPayload,
) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToCloud(email, passwordHash, getData()).catch(() => {});
    syncTimer = null;
  }, 4000);
}
