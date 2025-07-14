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


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memento Protocol is a CLI tool that creates a lightweight meta-framework for Claude Code. The project uses CLAUDE.md as a minimal router to specialized modes and workflows, implementing a lazy-loading architecture to minimize token usage.

## Development Commands

Since this is a greenfield project in the design phase, development commands will be established as per ticket 001:

```bash
# Build TypeScript to JavaScript (once implemented)
npm run build

# Development mode with auto-rebuild
npm run watch

# Run test suite (Jest-based, per ticket 014)
npm run test

# Run a single test file
npm test -- path/to/test.spec.ts

# Build single-file executable
npm run package
```

## Architecture

### Core Design Pattern: Minimal Router
- CLAUDE.md serves as a navigation guide (< 50 lines)
- Components are lazy-loaded only when needed
- State is managed explicitly through a ticket system

### Directory Structure (Planned)
```
project-root/
├── CLAUDE.md                    # Minimal router
└── .memento/                    # Framework directory (gitignored)
    ├── modes/                   # Personality definitions
    ├── workflows/               # Reusable procedures
    ├── languages/               # Language-specific overrides
    ├── integrations/            # Tool wrappers
    └── tickets/                 # Workspace for state management
```

### Component Types

1. **Modes**: Behavioral patterns (Project Manager, Architect, Engineer, Reviewer)
2. **Workflows**: Step-by-step procedures (Summarize, Review)
3. **Language Overrides**: Language-specific enhancements
4. **Integrations**: External tool wrappers

### Implementation Phases

The project follows a ticket-based development approach with 18 implementation tickets:

- **Phase 1**: Core Infrastructure (CLI setup with Commander.js, TypeScript, esbuild)
- **Phase 2**: Component Management (template repository and installer)
- **Phase 3**: Project Integration (CLAUDE.md enhancement)
- **Phase 4**: State Management (ticket system)
- **Phase 5**: Polish & Distribution

### Key Technical Decisions

- **Language**: TypeScript with Node.js
- **CLI Framework**: Commander.js
- **Build Tool**: esbuild (for single-file executable)
- **Testing**: Jest with 80%+ coverage target
- **State Management**: File-based tickets in `.memento/tickets/`

## Working with Tickets

When implementing features, follow the numbered tickets in the `tickets/` directory. Each ticket contains:
- Objective
- Task checklist
- Dependencies
- Acceptance criteria

Start with ticket 001 (CLI Scaffolding) and proceed sequentially through the phases.

## Testing Approach

Per ticket 014, ensure comprehensive testing for:
- Directory structure creation
- Component installation
- CLAUDE.md generation
- Ticket management
- Configuration handling

Use mocked file system for unit tests and aim for 80%+ code coverage.