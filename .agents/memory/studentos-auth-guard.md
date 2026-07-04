---
name: StudentOS auth guard pattern
description: How auth routing is structured in the StudentOS Expo app.
---

Auth is guarded in `app/(tabs)/_layout.tsx` using `useAuth()` from `AuthContext`. If the user is not authenticated, the layout renders `<Redirect href="/splash" />` before any tab is shown.

Flow: app loads → `(tabs)/_layout.tsx` checks `isAuthenticated` → if false, redirect to `/splash` → splash reads `hasSeenOnboarding` and routes to `/onboarding` (first time) or `/auth` (returning) → after login/signup, `router.replace('/(tabs)')`.

The root `app/_layout.tsx` wraps the full tree with `AuthProvider` and `AppProvider` (in that order) inside `GestureHandlerRootView > KeyboardProvider`.

**Why:** This is the idiomatic Expo Router approach — no root `app/index.tsx` redirect needed, and the guard runs at the layout level so all 4 tabs are protected.
