# StudentOS

A premium, warm mobile-first student life app combining academic management (subjects, attendance, assignments, classes) with personal life management (habits, skills, to-dos) in one cohesive product. Built with Expo + React Native.

## Run & Operate

- `pnpm --filter @workspace/student-os run dev` — run the Expo dev server
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, Expo Router (file-based routing)
- State: React Context + AsyncStorage (offline-first, no backend needed for v1)
- Fonts: Nunito (headings) + Inter (body) via @expo-google-fonts
- Icons: @expo/vector-icons (Feather + SF Symbols on iOS 26)
- API: Express 5 (shared backend, not yet used by mobile)
- DB: PostgreSQL + Drizzle ORM (available, not yet used by mobile)

## Where things live

- `artifacts/student-os/` — Expo mobile app
  - `app/_layout.tsx` — root layout with fonts, providers, Stack nav
  - `app/(tabs)/_layout.tsx` — 4-tab bottom nav (Home, Academic, Personal, Profile)
  - `app/splash.tsx` — animated splash + auth routing
  - `app/onboarding.tsx` — 3-slide onboarding
  - `app/auth.tsx` — login / sign-up screen
  - `app/(tabs)/index.tsx` — home dashboard (all live widgets)
  - `app/(tabs)/academic.tsx` — subjects, attendance, assignments, classes (inner tabs)
  - `app/(tabs)/personal.tsx` — habits, skills, to-do (inner tabs)
  - `app/(tabs)/profile.tsx` — profile view/edit, settings, account actions
  - `context/AuthContext.tsx` — auth state + AsyncStorage persistence
  - `context/AppContext.tsx` — all app data (subjects, assignments, habits, etc.)
  - `constants/colors.ts` — warm pastel StudentOS theme (light + dark)
  - `components/ProgressRing.tsx` — circular progress ring
  - `components/TopTabBar.tsx` — custom inner tab bar

## Architecture decisions

- **AsyncStorage-first**: All data stored locally. No backend calls from mobile in v1. Enables offline-first without complexity.
- **React Context over Redux**: App state is simple enough for Context; avoids extra boilerplate.
- **Single-file inner tabs**: Academic and Personal inner tabs are single screen files with state-managed tab switching rather than nested Expo Router layouts — simpler and fewer re-render issues.
- **Auth guard in tab layout**: Auth check happens in `(tabs)/_layout.tsx` via `useAuth()`, redirecting unauthenticated users to `/splash`.
- **Nunito + Inter font pairing**: Nunito for warm, friendly headings; Inter for legible body text — per spec §5.2.

## Product

StudentOS is a student life OS combining:
- **Academic**: Subject manager → Attendance tracker with "Can I Bunk?" calculator → Assignment tracker with status pills → Class timetable (weekly, recurring)
- **Personal**: Habit tracker with 7-day dot grid and streaks → Skill tracker with level slider and milestone badges → To-do list with subtasks and priority
- **Home Dashboard**: Live remaining-classes counter (updates every minute), attendance health, pending assignments, habits due today (tap to complete), weekly progress ring, upcoming deadlines
- **Auth flow**: Splash → 3-slide Onboarding → Sign Up / Login

## User preferences

_Populate as needed._

## Gotchas

- Never put bare string values (e.g. `'#FF6B6B'`) as entries in `StyleSheet.create()` — will crash on web with "Invalid value used as weak map key".
- The `useColors()` hook now accesses `colors.dark` directly (TypeScript-safe) — do not revert to the `Record<string, typeof colors.light>` cast.
- Expo Go uses HMR — only restart the workflow when changing dependencies or hitting Metro errors.
- Do not use `uuid` package in Expo — use the `generateId()` helper in `storage/storage.ts` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns (safe area, fonts, keyboard handling)
