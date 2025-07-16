# Multi-Agent Support

Memento Protocol supports multiple AI coding assistants, each with their own configuration format and capabilities. This document explains how each agent works and how to add custom agents.

## Supported Agents

### Claude (Claude Code)
**File**: `CLAUDE.md`  
**Format**: Markdown router with Memento Protocol instructions

Claude uses a markdown file that serves as a router, directing Claude to load specific modes, workflows, and tickets based on the task at hand. The file includes:
- Router instructions for loading Memento components
- Project-specific context
- Mode activation commands
- Workflow execution instructions

Example content:
```markdown
# CLAUDE.md - Your Project Name

This file serves as a minimal router for Claude Code...

## Available Commands
### Activate a Mode
- `project manager` - Planning and coordination
- `architect` - System design and technical decisions
...
```

### Cursor
**File**: `.cursorrules`  
**Format**: Rules-based configuration for Cursor IDE

Cursor uses a rules file that defines coding conventions, best practices, and project-specific guidelines. The file includes:
- Code style and structure guidelines
- Language-specific conventions
- Framework-specific patterns
- Development workflow instructions

Example content:
```markdown
# .cursorrules - Your Project Name

## Code Style and Structure Guidelines
### General Principles
- Write clean, readable, and maintainable code
- Follow the DRY principle
...
```

### Gemini (Gemini CLI)
**File**: `GEMINI.md`  
**Format**: Hierarchical markdown context

Gemini uses a structured markdown file that provides comprehensive project context and guidelines. The file includes:
- Project overview and goals
- Technical stack details
- Development guidelines
- Testing and deployment instructions

Example content:
```markdown
# GEMINI.md - Your Project Name

## Project Overview
### Description
Your project description here...

### Primary Goals
- Goal 1
- Goal 2
...
```

## How Agent Files Are Generated

When you initialize Memento Protocol or add an agent, the system:

1. **Detects Project Information**: Analyzes your project to understand:
   - Project name and type
   - Primary programming language
   - Framework and dependencies
   - Project structure

2. **Loads Agent Template**: Each agent has a template in `templates/agents/`
   - Templates include placeholders for project-specific information
   - Placeholders are replaced with detected or configured values

3. **Customizes Content**: The generator fills in:
   - Project description and goals
   - Technical stack details
   - Language-specific guidelines
   - Framework conventions
   - Memento Protocol instructions (if applicable)

4. **Creates Configuration File**: The customized content is written to the appropriate file in your project root

## Adding Custom Agents

To add support for a new AI agent, you would need to:

1. **Define Agent Configuration**: Add the agent to `src/types/config.ts`:
```typescript
{
  id: 'your-agent',
  name: 'Your Agent Name',
  filename: 'YOUR_AGENT.md',
  format: AgentFormat.MARKDOWN_CONTEXT,
  description: 'Your agent description',
  enabled: true
}
```

2. **Create Agent Template**: Add a template file to `templates/agents/your-agent.md` with placeholders:
```markdown
# YOUR_AGENT.md - {{PROJECT_NAME}}

## Project Context
{{PROJECT_DESCRIPTION}}

### Technical Stack
{{TECH_STACK}}

...
```

3. **Update Generator Logic**: Modify `src/lib/agentFileGenerator.ts` if your agent needs special handling

## Agent Selection During Setup

When running `memento init`, you'll see:

```
? Which AI agents will you be using? (Press <space> to select, <a> to toggle all)
❯◉ Claude - Claude AI assistant with markdown-based router configuration
 ◯ Cursor - Cursor IDE with rules-based configuration
 ◯ Gemini - Google Gemini AI with markdown context configuration
```

Claude is selected by default as it's the primary agent for Memento Protocol's advanced features (modes, workflows, tickets).

## Best Practices

1. **Choose Relevant Agents**: Only add agents you actually use to avoid clutter
2. **Keep Files Updated**: When project structure changes significantly, regenerate agent files
3. **Customize Templates**: Edit generated files to add project-specific instructions
4. **Version Control**: Commit agent files to share consistent AI behavior across your team

## Differences Between Agents

| Feature | Claude | Cursor | Gemini |
|---------|--------|--------|--------|
| File Format | Markdown Router | Rules File | Markdown Context |
| Memento Modes | ✓ Full Support | ✗ Reference Only | ✗ Reference Only |
| Memento Workflows | ✓ Full Support | ✗ Reference Only | ✗ Reference Only |
| Ticket Management | ✓ Full Support | ✗ Reference Only | ✗ Reference Only |
| Code Conventions | ✓ Via Modes | ✓ Primary Focus | ✓ Included |
| Project Context | ✓ Minimal | ✓ Detailed | ✓ Comprehensive |

## Troubleshooting

### Agent file not recognized
- Ensure the file is in the project root directory
- Check that the filename matches exactly (including case)
- Verify file permissions allow reading

### Wrong content generated
- Review project detection in `memento init` output
- Manually edit the generated file to correct information
- Use `memento add-agent --force` to regenerate

### Custom agent not working
- Verify agent configuration in source code
- Check template file exists and has correct placeholders
- Ensure generator handles your agent format correctly