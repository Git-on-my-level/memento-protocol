# Simplify HookManager (Partial Refactor)

## Priority: 🔴 High - Complexity Reduction

## Description
Extract concerns from the 763-line HookManager.ts to make it more maintainable while keeping valuable validation logic.

## Tasks
- [ ] Extract permission generation to `PermissionGenerator` class (~200 lines)
- [ ] Extract file operations to `HookFileManager` class (~150 lines)
- [ ] Keep validation logic in HookManager (valuable for early error detection)
- [ ] Update imports and ensure all tests pass
- [ ] Verify hook functionality still works end-to-end

## Impact
- **Code reduction**: 350+ lines from HookManager
- **Complexity**: Significantly reduced (single responsibility)
- **Risk**: Medium (core functionality, but well-tested)
- **Time estimate**: 2 hours

## Architecture
```
HookManager (reduced to ~400 lines)
├── PermissionGenerator (new, ~200 lines)
├── HookFileManager (new, ~150 lines)
└── HookValidator (existing, keep as-is)
```

## Notes
Keep the valuable semantic validation that Claude Code doesn't provide (security checks, environment validation). Focus on separating concerns, not removing functionality.

---
Created: 2025-08-27T09:49:08.577Z
