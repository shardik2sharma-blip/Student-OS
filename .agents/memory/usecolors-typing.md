---
name: useColors typing fix
description: How to type the useColors hook correctly when colors.ts has both light/dark palettes and a radius field.
---

The scaffold's original `useColors` used `(colors as Record<string, typeof colors.light>).dark` to access the dark palette. This fails (TS2352) once `colors` also has a `radius: number` field, because `number` is not assignable to `typeof colors.light`.

**Fix:** Access `colors.dark` directly — TypeScript knows it exists once you define it in `constants/colors.ts`:

```ts
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
```

**Why:** The cast was defensive scaffolding for when `dark` might not exist. Once `dark` is properly defined in the colors constant, no cast is needed.
