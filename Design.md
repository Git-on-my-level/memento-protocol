# MementoProtocol - A Claude Code Meta-Framework

## Vision

Create a CLI tool that establishes a lightweight meta-framework for AI coding assistants, where agent-specific configuration files (CLAUDE.md, .cursorrules, GEMINI.md) guide each AI to understand project context and, for Claude specifically, find and use specialized modes (personalities) and workflows (procedures).

## Core Principles

### 1. Minimal Router Pattern
For Claude, the CLAUDE.md file serves as a navigation guide, keeping token usage minimal by loading instructions only when explicitly needed. Other agents receive project-specific configuration in their native formats.

### 2. Composable Architecture
Modes, workflows, and integrations are modular components that can be combined, extended, and overridden without modifying the core system.

### 3. Explicit State Management
Complex work is tracked in a gitignored workspace, enabling session continuity and multi-agent coordination.

## System Architecture

### Directory Structure
```
project-root/
├── CLAUDE.md                    # Claude router (< 200 lines)
├── .cursorrules                 # Cursor configuration (optional)
├── GEMINI.md                    # Gemini context (optional)
└── .memento/                    # Framework directory (gitignored)
    ├── modes/                   # Personality definitions (Claude)
    ├── workflows/               # Reusable procedures (Claude)
    ├── languages/               # Language-specific overrides
    ├── integrations/            # Tool wrappers (e.g., memory-mcp)
    └── tickets/                 # Workspace for state management
        └── [ticket-id]/         # Task-specific working directory
```

### Component Types

#### Modes (Personalities)
Behavioral patterns that define how Claude approaches tasks:
- **Project Manager**: Planning, coordination, high-level decisions
- **Architect**: System design, technical decisions, patterns
- **Engineer**: Implementation, coding, debugging
- **Reviewer**: Code review, quality assurance, feedback

Each mode must include:
- **Core Responsibilities**: Primary focus areas and tasks
- **Done When**: Clear, testable completion criteria
- **Mode-specific sections**: Additional guidance as needed

#### Workflows (Procedures, sub-Agents)
Step-by-step procedures for common tasks:
- **Summarize**: Summarize some logic, directories, or topic, to compress context
- **Review**: Code review, audit

#### Language Overrides
Language-specific implementations that enhance base workflows with specialized tools and patterns.

#### Integration Wrappers
Patterns that wrap workflows with external tool interactions (pre/post hooks).

## Key Design Decisions

### 1. Lazy Loading
Files are read only when explicitly requested through mode activation or workflow invocation. The CLAUDE.md router contains only navigation instructions.

### 2. Ticket-Based State Management
The `.memento/tickets/` directory serves as a persistent workspace where:
- Progress is tracked across sessions
- Multiple agents can coordinate
- Context is preserved between mode switches
- Work artifacts are organized

### 3. Clear Context Management
- Only one mode active at a time
- Tickets provide continuity when needed
- No implicit state carryover

### 4. Git-Based Safety
- Leverage git for rollback capabilities
- Use git worktrees for parallel work

### 5. Discovery Through Tooling
The CLI tool handles discovery during:
- Interactive setup (showing available modes/workflows)
- Installation process (listing components)
- Help commands within the tool

## Workflow Execution Model

### Basic Flow
1. User requests mode: "act as architect"
2. Claude reads `.memento/modes/architect.md`
3. User, mode, or agent requests workflow: "execute refactor"
4. Claude reads `.memento/workflows/refactor.md`
5. If language-specific: overlay `.memento/languages/[lang]/refactor.md`
6. If integrations active: apply wrappers from `.memento/integrations/`

### State Persistence
1. Create ticket: `.memento/tickets/refactor-auth-2025-01-13/`
2. Track progress: `.memento/tickets/refactor-auth-2025-01-13/progress.md`
3. Store decisions: `.memento/tickets/refactor-auth-2025-01-13/decisions.md`
4. Resume later: "continue ticket refactor-auth-2025-01-13"

## CLI Tool Responsibilities

### Setup Phase
1. Initialize `.memento/` directory structure
2. Install selected modes and workflows
3. Configure language-specific overrides
4. Set up integration wrappers

### Maintenance Phase
1. Add/remove components
2. Update from template repository
3. Validate framework integrity
4. Manage ticket lifecycle

### Enhancement Phase
1. Analyze existing CLAUDE.md
2. Preserve project-specific content
3. Add router instructions
4. Suggest relevant components

## Extension Points

### Custom Modes
Projects can add domain-specific modes:
- `.memento/modes/data-scientist.md`
- `.memento/modes/devops.md`

### Custom Workflows
Teams can create specialized procedures:
- `.memento/workflows/deploy.md`
- `.memento/workflows/migrate-database.md`

### Project-Specific Integrations
Local tool wrappers:
- `.memento/integrations/internal-api.md`
- `.memento/integrations/ci-system.md`

## Success Metrics

1. **Token Efficiency**: Agent files remain concise and focused
2. **Modularity**: Components can be added/removed independently
3. **Discoverability**: Users can easily find available modes/workflows
4. **Resumability**: Work can continue across sessions via tickets
5. **Composability**: Workflows can be extended without modification

## Non-Goals

1. **Not a package manager**: Focus on template management, not dependency resolution
2. **Not a runtime**: No process management or service orchestration
3. **Not a state database**: Tickets are working directories, not structured storage
4. **Not an IDE plugin**: CLI-first, integration-agnostic approach

This design provides a foundation for iterative development while maintaining clarity about the system's purpose and boundaries.
