---
name: StyleSheet.create string values
description: Bare string values in StyleSheet.create crash on web — how to detect and fix.
---

Bare string values (e.g. `color: '#FF6B6B'` at the style-object level, not inside a nested style object) passed to `StyleSheet.create()` crash on React Native Web with:

> TypeError: Invalid value used as weak map key

**Why:** On web, RN's StyleSheet uses a WeakMap to cache style objects. A primitive string is not a valid WeakMap key.

**How to apply:** Any time you add entries to a `StyleSheet.create({})` call, ensure every value is a style object `{}`, never a bare primitive. If you want to refer to a color constant, define it outside StyleSheet or use `useColors()` inline.

**Detection:** `grep -n "': '#" styles.ts` (look for string values at top-level of StyleSheet.create).
