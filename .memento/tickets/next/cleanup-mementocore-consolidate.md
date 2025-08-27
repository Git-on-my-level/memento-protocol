# Consolidate MementoCore

## Priority: 🟡 Medium - Architecture Alignment

## Description
MementoCore.ts is 683 lines with complex resolution logic. Much of this is runtime behavior that could be simplified for a file generator.

## Tasks
- [ ] Analyze component resolution complexity - is it all needed?
- [ ] Identify runtime vs build-time concerns
- [ ] Simplify resolution to focus on template discovery and copying
- [ ] Consider removing caching if it adds unnecessary complexity
- [ ] Document simplified component model

## Impact
- **Potential reduction**: 200-300 lines
- **Complexity**: Moderate simplification
- **Risk**: Medium (core component system)
- **Time estimate**: 4-5 hours

## Current Complexity
- Multiple scopes (global, project, builtin)
- Complex merging logic
- Caching layer
- Error handling for various edge cases

## Simplified Approach
Focus on:
1. Find template file
2. Copy to destination
3. Basic conflict resolution (overwrite/skip)

Remove:
- Complex runtime resolution
- Multi-layered caching
- Elaborate merging strategies

## Notes
Remember: Memento generates config files for Claude Code. We don't need runtime complexity for what is essentially a sophisticated copy operation.

---
Created: 2025-08-27T09:50:18.595Z
