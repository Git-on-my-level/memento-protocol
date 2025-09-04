# Implement Starter Packs (oh-my-memento)

## Priority: 🟢 High - Core User Experience Feature

## Description
Implement curated starter packs that instantly configure Claude Code for specific development workflows, providing the "wow" moment similar to oh-my-zsh themes. Start with internal implementation to prove the concept before building external infrastructure.

## Acceptance Criteria
- [ ] Users can install a starter pack with a single command
- [ ] Frontend starter pack fully functional with modes, workflows, and hooks
- [ ] Interactive selection UI when no pack specified
- [ ] Clear documentation and usage examples
- [ ] Tests pass with >80% coverage for new code

## Implementation Plan

### Phase 1: Foundation (Schema & Structure)
- [ ] Create `templates/starter-packs/` directory
- [ ] Define JSON schema for pack definitions
- [ ] Create StarterPackManager class
- [ ] Add pack validation logic

### Phase 2: Frontend Starter Pack
- [ ] Create frontend.json pack definition
- [ ] Include react-focused modes (architect, engineer, reviewer)
- [ ] Add component-related workflows
- [ ] Include relevant hooks (jsx-context, component-detector)
- [ ] Set sensible defaults and configuration

### Phase 3: Init Command Integration  
- [ ] Add `--starter-pack` option to init command
- [ ] Implement pack resolution and installation
- [ ] Add interactive pack selection when no pack specified
- [ ] Handle component dependency resolution
- [ ] Ensure backwards compatibility

### Phase 4: Testing & Validation
- [ ] Unit tests for StarterPackManager
- [ ] Integration tests for pack installation
- [ ] Test conflict resolution
- [ ] Test interactive UI flow
- [ ] Manual testing of Frontend pack

### Phase 5: Documentation
- [ ] Update README with starter pack section
- [ ] Create usage examples
- [ ] Document pack definition schema
- [ ] Add troubleshooting guide

## Technical Design

### Pack Definition Schema (frontend.json)
```json
{
  "name": "frontend",
  "displayName": "Frontend Development Pack",
  "description": "React, components, and modern UI development",
  "version": "1.0.0",
  "mementoVersion": ">=0.9.0",
  "author": "zcc",
  "components": {
    "modes": [
      {
        "name": "react-architect",
        "description": "Architect mode specialized for React applications",
        "template": "architect",
        "customization": {
          "focus": "component architecture, state management, performance"
        }
      },
      {
        "name": "component-engineer", 
        "template": "engineer",
        "customization": {
          "focus": "React components, hooks, testing"
        }
      },
      {
        "name": "ui-reviewer",
        "template": "reviewer",
        "customization": {
          "focus": "accessibility, performance, best practices"
        }
      }
    ],
    "workflows": [
      "component-creation",
      "state-management", 
      "style-system"
    ],
    "hooks": [
      "jsx-context-loader",
      "component-detector"
    ],
    "agents": []
  },
  "configuration": {
    "defaultMode": "component-engineer",
    "autoDetect": {
      "patterns": ["*.jsx", "*.tsx", "package.json:react"]
    }
  }
}
```

### StarterPackManager API
```typescript
class StarterPackManager {
  async listPacks(): Promise<StarterPackInfo[]>
  async loadPack(name: string): Promise<StarterPack>
  async installPack(pack: StarterPack, options: InstallOptions): Promise<void>
  async validatePack(pack: StarterPack): Promise<ValidationResult>
  async resolveDependencies(pack: StarterPack): Promise<ComponentList>
}
```

### CLI Usage
```bash
# Interactive selection
npx zcc init --starter-pack

# Direct installation  
npx zcc init --starter-pack frontend

# Non-interactive with pack
npx zcc init --starter-pack frontend --non-interactive
```

## Success Metrics
- Installation completes in <10 seconds
- Zero configuration required after installation
- Users immediately productive with specialized modes
- Clear value proposition demonstrated

## Risk Mitigation
- Start simple: one pack, basic features
- No external dependencies initially
- Backwards compatible with existing init flow
- Can be disabled with flag if issues arise

## Future Enhancements (Not in scope)
- Backend and DevOps starter packs
- External pack repositories
- Community-contributed packs
- Pack marketplace/discovery

---
Created: 2025-08-27
Status: next
Assignee: autonomous-project-manager