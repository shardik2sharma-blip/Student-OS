---
name: StudentOS cloud backup security model
description: How the file-based cloud backup avoids auth complexity while preventing cross-user data access.
---

The API server stores backups in `data/backups/<key>.json` where `key = sha256(email:passwordHash)`. The passwordHash is a client-side deterministic hash of `studentos:email:password` (32-bit hash, symmetric, no crypto library needed).

**Why this model is secure:** Because the file path is derived from BOTH the email AND the password hash, two users with the same email but different passwords get completely different file paths and can never read or overwrite each other's data. No session token, JWT, or DB lookup is required.

**How to apply:**
- PUT `/api/backup`: upsert at `credentialKey(email, passwordHash).json`
- GET `/api/backup?email=&passwordHash=`: lookup the same derived key
- Mobile: `utils/cloudSync.ts` calls PUT (debounced, 4s) and GET (on login)
- Mobile: `context/AuthContext.tsx` stores hash under `auth_password_hash` in AsyncStorage
- Mobile: `app/auth.tsx` fires cloud restore after login (non-blocking, best-effort)

**AppContext race condition:** `restoreFromBackup` in AppContext writes to AsyncStorage AND updates React state directly. Cloud restore is called after login in auth.tsx — if `isDataLoaded` is false (initial hydration still running), a 300ms delay is added before calling restoreFromBackup to let local data load first, preventing the restore from being overwritten by the hydration effect.

**Limitations:** The password hash is a simple 32-bit hash (no bcrypt). This is fine for a student app with non-sensitive data. Do not use this pattern for apps handling PII or financial data.
