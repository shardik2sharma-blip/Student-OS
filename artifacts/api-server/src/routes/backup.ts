/**
 * Backup routes — simple file-based cloud backup for StudentOS.
 *
 * Security model: the backup file is keyed by sha256(email:passwordHash).
 * Because the file path is derived from BOTH the email AND the password hash,
 * a third party who doesn't know the password cannot discover or overwrite
 * another user's backup — they would land on a different file path entirely.
 * No additional auth token is required; possessing the correct key IS the auth.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();
const DATA_DIR = join(process.cwd(), "data", "backups");

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Prevent brute-forcing credential keys.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // max 30 reads per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,                   // max 60 writes per IP per window (app syncs every 4s)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Derive a filesystem-safe key from credentials — acts as implicit auth. */
function credentialKey(email: string, passwordHash: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${passwordHash}`)
    .digest("hex");
}

type BackupFile = {
  data: unknown;
  updatedAt: string;
};

/** PUT /api/backup — create or overwrite the backup for this credential pair. */
router.put("/backup", writeLimiter, async (req: Request, res: Response) => {
  const { email, passwordHash, data } = req.body as {
    email?: string;
    passwordHash?: string;
    data?: unknown;
  };

  if (!email || !passwordHash || data === undefined) {
    return res.status(400).json({ error: "email, passwordHash and data are required" });
  }

  try {
    await ensureDir();
    const file = join(DATA_DIR, `${credentialKey(email, passwordHash)}.json`);
    const backup: BackupFile = { data, updatedAt: new Date().toISOString() };
    await fs.writeFile(file, JSON.stringify(backup), "utf8");
    return res.json({ ok: true, updatedAt: backup.updatedAt });
  } catch {
    return res.status(500).json({ error: "Failed to save backup" });
  }
});

/** GET /api/backup?email=&passwordHash= — retrieve the backup for this credential pair. */
router.get("/backup", readLimiter, async (req: Request, res: Response) => {
  const { email, passwordHash } = req.query as {
    email?: string;
    passwordHash?: string;
  };

  if (!email || !passwordHash) {
    return res.status(400).json({ error: "email and passwordHash are required" });
  }

  try {
    await ensureDir();
    const file = join(DATA_DIR, `${credentialKey(email, passwordHash)}.json`);
    let backup: BackupFile;
    try {
      backup = JSON.parse(await fs.readFile(file, "utf8")) as BackupFile;
    } catch {
      return res.status(404).json({ error: "No backup found for this account" });
    }
    return res.json({ ok: true, data: backup.data, updatedAt: backup.updatedAt });
  } catch {
    return res.status(500).json({ error: "Failed to retrieve backup" });
  }
});

export default router;
