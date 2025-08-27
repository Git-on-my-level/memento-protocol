# Clean Configuration Refactor: Directory-Based System

**Status:** next  
**Created:** 2025-08-27  
**Issue:** #25 (revised approach)
**Type:** Epic

## Overview
Complete refactor of the configuration system to use a clean, directory-based approach without backward compatibility constraints. Both global (~/.memento/) and project (.memento/) scopes will follow identical structure.

## Core Design Principles
1. **No backward compatibility** - Clean slate for maintainable code
2. **Unified structure** - Same directory layout for global and project
3. **Predictable precedence** - Project → Global → Built-in
4. **Proper script context** - Scripts always run in project root with context variables

## Directory Structure
```
~/.memento/                      # Global scope
.memento/                        # Project scope

Both contain:
├── config.yaml                  # Configuration settings
├── modes/                       # AI personality modes
├── workflows/                   # Reusable procedures
├── agents/                      # Claude Code subagents
├── hooks/                       # Event-driven automation
├── scripts/                     # Executable scripts
├── commands/                    # Custom slash commands
└── templates/                   # User templates for scaffolding
```

## Implementation Phases

### Phase 1: Core Refactor ⏳
**Goal**: Replace configuration system with clean architecture

**Tasks**:
- [ ] Remove RCFileLoader completely
- [ ] Remove all .mementorc references
- [ ] Create MementoCore class for unified management
- [ ] Create MementoScope class for single scope handling
- [ ] Implement clean configuration loading (YAML only)
- [ ] Update all commands to use new system
- [ ] Add comprehensive tests

**Deliverables**:
- src/lib/MementoCore.ts
- src/lib/MementoScope.ts
- Removed: src/lib/rcFileLoader.ts
- Updated: all command files

### Phase 2: Script Context System ⏳
**Goal**: Proper script execution with context management

**Tasks**:
- [ ] Create ScriptExecutor class
- [ ] Implement script context environment variables
- [ ] Ensure scripts run in project root
- [ ] Handle global vs project script paths
- [ ] Add script discovery and resolution
- [ ] Test cross-platform compatibility

**Environment Variables**:
- MEMENTO_SCRIPT_SOURCE: Path to script file
- MEMENTO_SCRIPT_SCOPE: 'global' | 'project'
- MEMENTO_PROJECT_ROOT: Project directory
- MEMENTO_GLOBAL_ROOT: ~/.memento path

**Deliverables**:
- src/lib/ScriptExecutor.ts
- Updated hook/script execution logic
- Script execution tests

### Phase 3: Component Resolution ⏳
**Goal**: Unified component discovery and loading

**Tasks**:
- [ ] Implement component resolution order (project → global → built-in)
- [ ] Add fuzzy matching across all scopes
- [ ] Create component caching for performance
- [ ] Handle name conflicts gracefully
- [ ] Improve error messages for missing components
- [ ] Add component listing across scopes

**Deliverables**:
- Enhanced MementoCore component methods
- Updated list/add commands
- Component resolution tests

### Phase 4: Testing & Documentation ⏳
**Goal**: Comprehensive testing and clear documentation

**Tasks**:
- [ ] Unit tests for all new classes
- [ ] Integration tests for full workflows
- [ ] Update README with new structure
- [ ] Create migration guide
- [ ] Add example configurations
- [ ] Update CLAUDE.md

**Coverage Goals**:
- MementoCore: >90%
- MementoScope: >90%
- ScriptExecutor: >85%
- Overall: Maintain current thresholds

## Success Criteria
- [ ] Clean, maintainable codebase
- [ ] All tests passing with good coverage
- [ ] Scripts work correctly with proper context
- [ ] Component resolution is predictable
- [ ] No backward compatibility debt
- [ ] Clear documentation

## Technical Decisions
1. **YAML only** for config files (no JSON/TOML)
2. **No migration** from old structures
3. **Scripts always run in project root**
4. **Global components available to all projects**
5. **Simple precedence rules**

## Risk Mitigation
- Breaking change for existing users → Clear migration guide
- Script context complexity → Comprehensive testing
- Cross-platform issues → Test on Windows/Mac/Linux

## Notes
This is a breaking change that establishes a solid foundation for future features. The clean architecture will enable:
- Starter packs (#24)
- Plugin manager (#27)
- Community repository (#26)
- Better performance and maintainability