---
name: StudentOS production config
description: Key production settings and what was hardened for the v1 release
---

## App identity
- name: "StudentOS", slug: "studentos", scheme: "studentos"
- iOS bundle ID: com.studentos.app
- Android package: com.studentos.app
- Splash uses `splash.png` (not icon.png)

## API security
- express-rate-limit added to both backup routes: 30 reads / 60 writes per 15-min window per IP
- Backup file key: sha256(email:passwordHash) — credential = auth

## Sync status
- `lastSyncedAt: string | null` added to AppContextType and AppProvider state
- Set to `new Date().toISOString()` after every successful syncToCloud call (both scheduleSync and syncNow)
- Shown in Profile tab under Settings → Cloud Backup row, with "Sync now" tap target

## Environment variables
- EXPO_PUBLIC_DOMAIN — required for cloud sync API base URL; set automatically by Replit
- SESSION_SECRET — required by API server; stored as a Replit Secret

**Why:** These were identified during a production audit before public launch. Keep these values consistent — changing slug or bundle ID after publish breaks store listings.

**How to apply:** When adding new features that touch app.json or backup routes, maintain these values and the rate-limit middleware pattern.
