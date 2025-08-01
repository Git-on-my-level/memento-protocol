# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
```bash
# Install dependencies
npm install

# Build the project (bundles with esbuild, adds shebang, copies templates)
npm run build

# Development mode (run TypeScript directly)
npm run dev

# Watch mode for development
npm run watch

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage (thresholds: 30% branches, 45% functions/lines/statements)
npm run test:coverage

# Run a specific test file
npx jest src/commands/__tests__/init.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="should create ticket"
```

### Publishing
```bash
# Prepare for publishing (runs tests and build)
npm run prepublishOnly

# The actual publish is handled by scripts/npm/commit-tag-and-publish.sh
```

## Development CLI

### Non-Interactive Initialization
- To run the current development CLI non-interactively `yarn dev init -- --force --non-interactive`

## Architecture

### Core Structure
Memento Protocol is a CLI tool that generates and manages a `CLAUDE.md` file for projects, providing Claude Code with contextual understanding through modes, workflows, and language overrides.

**Key Concepts:**
- **Modes**: AI personalities optimized for specific tasks (architect, engineer, reviewer)
- **Workflows**: Reusable procedures for common development patterns
- **Language Overrides**: Language-specific enhancements
- **Tickets**: State management for persistent task tracking

### Directory Layout
```
src/
├── cli.ts                 # Main entry point, command registration
├── commands/              # CLI command implementations
│   ├── init.ts           # Initialize/update Memento Protocol
│   ├── add.ts            # Add modes/workflows
│   ├── list.ts           # List available/installed components
│   ├── ticket.ts         # Ticket management (create/move/resolve)
│   ├── config.ts         # Configuration management
│   ├── update.ts         # Update components
│   └── upsert.ts         # Combined init/update logic
└── lib/                  # Core functionality
    ├── configManager.ts  # Config hierarchy (default->global->project->env)
    ├── ticketManager.ts  # Ticket lifecycle management
    ├── componentInstaller.ts # Install modes/workflows/languages
    ├── hookGenerator.ts  # Generate Claude Code hooks
    ├── projectDetector.ts # Detect project language/framework
    └── upsertManager.ts  # Smart init/update logic

templates/                # Component templates
├── modes/               # Built-in modes
├── workflows/           # Built-in workflows
└── metadata.json        # Component metadata
```

### Key Design Patterns

1. **Command Pattern**: Each CLI command is a separate module with its own Command instance
2. **Manager Pattern**: Functionality is organized into manager classes (ConfigManager, TicketManager, etc.)
3. **Template System**: Components are markdown templates that get copied and can be customized
4. **Hook System**: Generates Claude Code hooks for ticket-based workflow integration

### Build Process
The build uses esbuild (scripts/build.js) to:
1. Bundle TypeScript into a single CLI executable
2. Inject version from package.json
3. Add shebang for direct execution
4. Copy templates to dist directory

### Testing Strategy
- Uses Jest with ts-jest preset
- Mocks inquirer for interactive testing
- Coverage thresholds enforced
- Tests organized alongside source files in __tests__ directories

### Error Handling
- Custom error types in lib/errors.ts
- Global error handlers in cli.ts
- Verbose/debug logging options for troubleshooting

### Component System
Components (modes/workflows/languages) are:
- Stored as markdown files in .memento/ directory
- Installed from templates/ or custom sources
- Managed via metadata.json files
- Dynamically injected into CLAUDE.md

### Ticket Workflow
Tickets follow a lifecycle:
1. Created in `.memento/tickets/next/`
2. Moved to `.memento/tickets/in-progress/` when started
3. Moved to `.memento/tickets/done/` when completed
4. Can include context that gets injected into CLAUDE.md

## Development Guidelines

### Adding New Commands
1. Create command file in `src/commands/`
2. Export a Command instance
3. Register in `src/cli.ts`
4. Add tests in `src/commands/__tests__/`

### Adding New Components
1. Create markdown template in appropriate `templates/` subdirectory
2. Follow standardized structure (see docs/COMPONENT_GUIDE.md)
3. Update metadata.json
4. Test installation and CLAUDE.md generation

### Code Style
- TypeScript with strict mode
- CommonJS modules for Node.js compatibility
- Async/await for asynchronous operations
- Comprehensive error messages for CLI users

### Dependencies
- commander: CLI framework
- inquirer: Interactive prompts
- esbuild: Build tool
- jest/ts-jest: Testing framework