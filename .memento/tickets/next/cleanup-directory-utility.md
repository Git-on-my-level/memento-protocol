# Extract Directory Creation Utility

## Priority: 🔴 High - Quick Win

## Description
Consolidate 52+ duplicate instances of `fs.mkdir(..., { recursive: true })` into a single utility function.

## Tasks
- [ ] Create `ensureDirectory()` utility in `src/lib/utils/filesystem.ts`
- [ ] Replace all `fs.mkdir` calls with the new utility
- [ ] Update imports across the codebase
- [ ] Run tests to ensure functionality preserved

## Impact
- **Code reduction**: ~100 lines
- **Duplication eliminated**: 52 instances
- **Risk**: Low (simple refactoring)
- **Time estimate**: 30 minutes

## Implementation
```typescript
// src/lib/utils/filesystem.ts
export async function ensureDirectory(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}
```

## Notes
This pattern appears throughout commands, lib files, and tests. Centralizing will improve maintainability.

---
Created: 2025-08-27T09:48:35.870Z
