# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

A lightweight meta-framework for Claude Code that creates intelligent project context through minimal configuration.

## What is Memento Protocol?

Memento Protocol enhances Claude Code's understanding of your project by providing:
- **Modes**: AI personalities optimized for specific tasks (architect, engineer, reviewer)
- **Workflows**: Reusable procedures for common development patterns
- **Hooks**: Powerful automation and customization for Claude Code events
- **Tickets**: Persistent task tracking with context injection
- **Acronyms**: Automatic expansion of project-specific terminology
- **Custom Commands**: Direct access to Memento features through Claude's slash commands
- **Subagents**: Pre-configured AI specialists for enhanced capabilities

All through a simple `CLAUDE.md` file that acts as a minimal router.

## This tool is for you if you answer yes to any of the following questions
- Do you find yourself copy pasting between CLAUDE.md across projects all the time?
- Does Claude Code start to break down as your codebase gets bigger?
- Do you wish Claude would stop spamming markdown files and track its work in an opinionated and easy to clean up way?
- For more complex fixes does Claude tend to go in circles, repeating the same methods over and over again?

## Quick Start

The easiest way to get started is by using `npx`, which allows you to run `memento-protocol` without a permanent installation.

To initialize Memento Protocol in your project, run the interactive setup:
```bash
npx memento-protocol init
```

You can also initialize with options, for example:
```bash
npx memento-protocol init --mode engineer --language typescript
```

### Non-Interactive Setup

For CI/CD or automated environments, use non-interactive mode:
```bash
npx memento-protocol init --non-interactive --modes architect,engineer --workflows review --hooks git-context-loader,security-guard --default-mode architect
```

### All Recommended Components

To install all recommended components based on your project type:
```bash
npx memento-protocol init --all-recommended
```

This will create:
- `CLAUDE.md`: Your project's navigation guide for Claude
- `.memento/`: A directory for framework files (it's recommended to add this to `.gitignore`)

### Installation

While `npx` is recommended for trying out Memento Protocol, you may prefer a global installation for convenience.

```bash
# Using npm
npm install -g memento-protocol

# Now you can use the 'memento' command directly
memento init
```

For development, you can clone the repository:
```bash
# Using git
git clone https://github.com/git-on-my-level/memento-protocol.git
cd memento-protocol
npm install
npm link
```

## Basic Usage

Once initialized, Claude Code will automatically:
- Load your CLAUDE.md file for project context
- Execute hooks on specific events (prompts, tool usage, session start)
- Expand acronyms in your prompts
- Route modes, workflows, and tickets based on keywords
- Track persistent task state through tickets

## Commands

### Core Commands

#### `memento init`
Initialize Memento Protocol in your project with interactive setup:
```bash
memento init [options]

Options:
  -f, --force                Force initialization
  -n, --non-interactive      Non-interactive setup
  -g, --gitignore           Add .memento/ to .gitignore
  -m, --modes <modes>       Comma-separated list of modes
  -w, --workflows <flows>   Comma-separated list of workflows  
  -h, --hooks <hooks>       Comma-separated list of hooks
  -a, --all-recommended     Install all recommended components
  -d, --default-mode <mode> Set default mode
```

#### `memento update`
Update components and regenerate CLAUDE.md:
```bash
memento update
```

#### `memento` (no arguments)
Smart update - initializes if needed, otherwise updates:
```bash
memento
```

### Component Management

#### `memento add <type> <name>`
Add modes, workflows, language overrides, or agents:
```bash
memento add mode architect
memento add workflow review
memento add language typescript
memento add agent claude-code-research
```

#### `memento list`
List available and installed components:
```bash
memento list              # Show all available
memento list --installed  # Show only installed
```

### Hook Management

#### `memento hook`
Manage Claude Code hooks:
```bash
memento hook list                    # List all configured hooks
memento hook add security-guard      # Add hook from template
memento hook enable <id>             # Enable a hook
memento hook disable <id>            # Disable a hook
memento hook remove <id>             # Remove a hook
memento hook templates               # List available templates
```

### Ticket Management

#### `memento ticket`
Manage persistent task tickets:
```bash
memento ticket create "Add authentication"  # Create new ticket
memento ticket list                         # List all tickets
memento ticket list --status in-progress    # Filter by status
memento ticket start <id>                   # Move to in-progress
memento ticket resolve <id>                 # Mark as done
memento ticket delete <id>                  # Delete ticket
```

### Custom Commands Management

#### `memento command`
Manage Claude Code custom commands:
```bash
memento command install                     # Install custom commands
memento command status                      # Check installation status
memento command cleanup                     # Remove all commands
```

### Acronym Management

#### `memento acronym`
Manage project-specific acronyms:
```bash
memento acronym add api "Application Programming Interface"
memento acronym add ddd "Domain Driven Design"
memento acronym list                        # List all acronyms
memento acronym remove api                  # Remove an acronym
memento acronym clear                       # Clear all acronyms
```

### Configuration

#### `memento config`
Manage configuration:
```bash
memento config get defaultMode              # Get a setting
memento config set defaultMode engineer     # Set a setting
memento config list                         # List all settings
```

## Claude Code Integration

### Using Modes
Activate different AI personalities:
```
mode: architect     # System design focus
mode: engineer      # Implementation focus
mode: reviewer      # Code review focus
```

### Using Workflows
Execute predefined procedures:
```
workflow: review    # Comprehensive code review
workflow: summarize # Compress context
```

### Using Tickets
Track persistent tasks:
```
ticket: create "Add user authentication"
ticket: start auth-feature
ticket: done
```

### Using Custom Commands
Access Memento features directly in Claude:
```
/ticket:create my-feature    # Create a new ticket
/ticket:list                 # List all tickets
/mode:set architect          # Switch to architect mode
/memento:status             # Show project status
```

### Using Subagents
Leverage specialized AI agents:
```
# Install the Claude Code research agent
memento add agent claude-code-research

# Agent will be available for Claude to invoke automatically
# when you need help with Claude Code features
```

### Acronym Expansion
Configured acronyms are automatically expanded:
```
User: "Let's implement the API using DDD principles"
Claude sees: 
## Acronym Glossary
- **API**: Application Programming Interface  
- **DDD**: Domain Driven Design

---

Let's implement the API using DDD principles
```

## Hook System

Memento Protocol includes a powerful hook system for automation:

### Built-in Hooks
- **security-guard**: Blocks dangerous commands (sudo, rm -rf)
- **git-context-loader**: Loads git status and project structure at session start
- **acronym-expander**: Automatically expands configured acronyms

### Custom Hooks
Create custom automation for:
- Pre/post tool usage (formatting, linting, testing)
- Prompt filtering and modification
- Session initialization
- Command validation

See [docs/HOOKS_GUIDE.md](docs/HOOKS_GUIDE.md) for detailed documentation.

## Project Structure

```
.
├── CLAUDE.md          # Main router file for Claude Code
├── .claude/           # Claude Code specific directory
│   ├── agents/        # Installed subagents
│   └── commands/      # Custom slash commands
├── .memento/          # Framework directory (add to .gitignore)
│   ├── modes/         # Installed AI modes
│   ├── workflows/     # Installed workflows
│   ├── tickets/       # Task tickets (next/in-progress/done)
│   ├── hooks/         # Hook definitions and scripts
│   ├── acronyms.json  # Acronym definitions
│   └── config.json    # Project configuration
```

## Documentation

- [Component Guide](docs/COMPONENT_GUIDE.md) - Creating custom modes and workflows
- [Hooks Guide](docs/HOOKS_GUIDE.md) - Complete hook system documentation
- [API Reference](docs/API.md) - Programmatic usage
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## Examples

### Quick Project Setup
```bash
# Initialize with recommended components
npx memento-protocol init --all-recommended

# Add project acronyms
memento acronym add k8s "Kubernetes"
memento acronym add ci/cd "Continuous Integration/Continuous Deployment"

# Create initial tickets
memento ticket create "Setup testing framework"
memento ticket create "Add authentication"
```

### Custom Hook Example
```bash
# Add auto-formatting hook
cat > .memento/hooks/definitions/auto-format.json << 'EOF'
{
  "version": "1.0.0",
  "hooks": [{
    "id": "auto-format",
    "name": "Auto Formatter",
    "event": "PostToolUse",
    "enabled": true,
    "matcher": {
      "type": "tool",
      "pattern": "Write,Edit,MultiEdit"
    },
    "command": "npm run format -- $HOOK_TOOL_ARG_FILE_PATH",
    "continueOnError": true
  }]
}
EOF

# Regenerate hooks
memento
```

### Claude Code Commands Example
```bash
# Initialize with custom commands
npx memento-protocol init

# Now in Claude Code, you can use:
# /ticket:create authentication-system
# /ticket:list
# /mode:set architect
# /memento:status

# Commands are automatically available after init
```

### Subagent Example
```bash
# Add the Claude Code research agent
memento add agent claude-code-research

# The agent is now available for Claude to invoke
# when you ask about Claude Code features:
# "What are the latest features in Claude Code?"
# "How do I use MCP servers with Claude?"
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.