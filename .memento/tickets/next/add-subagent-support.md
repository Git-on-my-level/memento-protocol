# Add Claude Code Subagent Support to Memento Protocol

## Overview
Implement support for Claude Code's subagent configurations in Memento Protocol CLI, enabling projects to pre-load custom AI agents with specialized capabilities for enhanced developer workflows. Start with a basic `claude-code-research` agent that helps teams stay updated on Claude Code's latest features and capabilities.

## Background
Claude Code introduced a subagent system that allows developers to create specialized AI assistants for specific tasks. These agents are configured using markdown files with YAML frontmatter defining their name, description, and optionally tool access. Memento Protocol should integrate this capability to provide teams with consistent, project-specific AI assistance.

## Requirements

### Core Features
1. **Component Type Extension**
   - Add "agents" as a new component type alongside modes, workflows, and language overrides
   - Support both built-in and custom agent templates

2. **Agent Template System**
   - Create agent template structure: markdown files with YAML frontmatter
   - Support Claude Code agent configuration:
     - name (required, lowercase-hyphen-separated)
     - description (required, clear invocation criteria)
     - tools (optional, comma-separated list)

3. **CLI Commands**
   - `memento add agent <name>` - Add an agent from templates or custom source
   - `memento list agents` - List available agent templates
   - `memento list agents --installed` - List installed project agents
   - `memento update agent <name>` - Update an existing agent
   - `memento remove agent <name>` - Remove an installed agent

4. **Installation & Management**
   - Install agents to `.claude/agents/` directory in project
   - Support metadata tracking for installed agents
   - Handle agent updates and conflict resolution
   - Ensure proper Git integration (agents are version-controlled)

5. **Integration Points**
   - Update CLAUDE.md generation to reference installed agents
   - Extend project detector to suggest relevant agents based on project type
   - Consider ticket workflow integration for agent-based task automation

### Technical Implementation

1. **Directory Structure**
   ```
   templates/
   ├── agents/              # Built-in agent templates
   │   ├── code-reviewer.md
   │   ├── test-engineer.md
   │   ├── security-auditor.md
   │   └── metadata.json
   
   .memento/
   ├── agents/              # Installed agents (copied to .claude/agents/)
   │   └── metadata.json
   ```

2. **Agent Template Format**
   ```markdown
   ---
   name: claude-code-research
   description: Expert on Claude Code features and capabilities. Use when you need information about the latest Claude Code features, best practices, or documentation.
   tools: WebFetch, WebSearch, Read
   ---
   
   You are a Claude Code research specialist who helps teams stay updated on the latest features and capabilities...
   ```

3. **Component Installation Flow**
   - Extend `componentInstaller.ts` to handle agent type
   - Copy agent files to `.claude/agents/` (not `.memento/agents/`)
   - Update metadata tracking
   - Regenerate CLAUDE.md with agent references

4. **Initial Agent Template**
   - claude-code-research: Expert on Claude Code features, documentation, and best practices
   - Future agents can be added based on user needs

## Success Criteria
- [x] Users can install pre-configured agents with a single command
- [x] Agents are properly installed to `.claude/agents/` directory
- [ ] CLAUDE.md references available agents appropriately (Future enhancement)
- [x] Agent templates follow Claude Code's configuration format
- [x] Existing component system gracefully extends to support agents
- [ ] Documentation clearly explains agent usage and creation (Future enhancement)

## Testing Plan
- [ ] Unit tests for agent installation/removal
- [ ] Integration tests for CLI commands
- [ ] Test agent template validation
- [ ] Test conflict resolution for duplicate agent names
- [ ] Test CLAUDE.md generation with agents
- [ ] Manual testing with actual Claude Code integration

## Implementation Steps

### Phase 1: Foundation (MVP)
1. ✅ Extend component types to include "agents"
2. ✅ Create `claude-code-research` agent template
3. ✅ Update componentInstaller for agent handling
4. ✅ Implement basic add/list commands
5. ✅ Ensure agents are installed to `.claude/agents/`

### Phase 2: Future Enhancements
1. Add more built-in agent templates based on user feedback
2. Implement update/remove commands
3. Enhanced CLAUDE.md generation with agent references
4. Project-specific agent recommendations

## Notes
- Start simple with one well-crafted agent template
- Agents use markdown format with YAML frontmatter (not full YAML config)
- Focus on immediate value: helping teams stay updated on Claude Code features
- Maintain backward compatibility with current Memento Protocol features

## References
- Claude Code subagents documentation: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Agent configuration format and examples