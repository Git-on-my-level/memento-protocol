# Groundwork: Component Registry System

## Priority: 🔴 High - Blocks Starter Packs

## Description
Create infrastructure for discovering and installing components from multiple sources, enabling both internal starter packs and future external repositories.

## Tasks
- [ ] Define ComponentRegistry interface and types
- [ ] Extend componentInstaller to support multiple sources
- [ ] Add component manifest validation (version, dependencies)
- [ ] Create simple HTTP/Git fetcher for remote components
- [ ] Add registry configuration to zcc config
- [ ] Update init command to use registry system

## Technical Design

### Component Source Types
1. **builtin** - Templates bundled with CLI (current)
2. **local** - File path on user's machine
3. **git** - Git repository URL
4. **http** - Direct HTTP URL to component
5. **registry** - Future npm-like registry

### Manifest Enhancement
```yaml
# Every component gets enhanced frontmatter
---
name: component-name
version: 1.0.0
mementoVersion: ">=0.9.0"  # semver range
dependencies:              # other components needed
  - name: review-workflow
    version: "^1.0.0"
tags: [react, frontend]
---
```

### Registry Configuration
```json
{
  "registries": [
    {
      "name": "builtin",
      "type": "builtin"
    },
    {
      "name": "oh-my-memento", 
      "type": "git",
      "url": "https://github.com/oh-my-memento/starter-packs"
    }
  ]
}
```

## Success Criteria
- Can install components from Git URLs
- Version compatibility checking works
- Dependencies auto-install correctly
- Backwards compatible with current builtin system

## Why This Matters
This is the foundation that enables:
1. Starter packs (even internal ones with dependencies)
2. Community repositories
3. Plugin ecosystem
4. Version management

Without this, starter packs would just be "install these 10 things manually" which defeats the purpose.

---
Created: 2025-08-27