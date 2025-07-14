# CLAUDE.md - Memento Protocol Router

This file serves as a minimal router for Claude Code. Instructions are loaded on-demand from the .memento directory.

## Available Commands

### Activate a Mode
To switch behavioral patterns, use: **"act as [mode]"**
- `act as project-manager` - Planning and coordination
- `act as architect` - System design and technical decisions
- `act as engineer` - Implementation and debugging
- `act as reviewer` - Code review and quality checks

### Execute a Workflow
To run step-by-step procedures, use: **"execute [workflow]"**
- `execute summarize` - Compress context and analyze directories
- `execute review` - Perform code review and quality checks

### Work with Tickets
To manage stateful work, use: **"continue ticket [id]"**
- Tickets persist work across sessions in `.memento/tickets/`

## Component Location
All components are in the `.memento/` directory:
- **Modes**: `.memento/modes/[mode-name].md`
- **Workflows**: `.memento/workflows/[workflow-name].md`
- **Language overrides**: `.memento/languages/[lang]/[workflow].md`
- **Tickets**: `.memento/tickets/[ticket-id]/`

## Project-Specific Instructions
<!-- Project-specific content below this line -->
