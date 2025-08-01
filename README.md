# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

A powerful enhancement framework for Claude Code that transforms projects with intelligent context management, custom commands, and specialized AI agents.

## What is Memento Protocol?

Memento Protocol supercharges Claude Code with:
- **AI Modes**: Switchable personalities with fuzzy matching (architect, engineer, reviewer)
- **Claude Code Agents**: Specialized subagents for focused tasks (research, analysis, etc.)
- **Custom Commands**: Project-specific slash commands (/mode, /ticket, /memento)
- **Smart Hooks**: Automated workflows triggered by Claude Code events
- **Tickets**: Persistent task tracking with intelligent context injection
- **Workflows**: Reusable development procedures and patterns
- **Acronym Expansion**: Auto-expansion of project terminology

All managed through an intelligent hook system that seamlessly integrates with Claude Code.

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

### Force Reinitialize (Dogfooding)

For development or updating existing setups:
```bash
# Using yarn (no -- needed)
yarn dev init --force --non-interactive

# Using npm
npm run dev init -- --force --non-interactive
```

### All Recommended Components

To install all recommended components based on your project type:
```bash
npx memento-protocol init --all-recommended
```

This will create:
- `.memento/`: Framework configuration and components
- `.claude/`: Claude Code integration (agents, commands, settings)
- Shell scripts for dynamic behavior
- Hook configurations for automation

**Note**: The `.memento/` directory should be added to `.gitignore` as it contains generated files.

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
- Execute hooks for intelligent context routing and automation
- Enable custom slash commands (/mode, /ticket, /memento)
- Support fuzzy mode switching (e.g., 'apm' → 'autonomous-project-manager')
- Load specialized agents for enhanced capabilities
- Expand acronyms and inject relevant context
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
Add modes, workflows, or agents:
```bash
memento add mode architect              # Add AI mode
memento add workflow review             # Add workflow
memento add agent claude-code-research  # Add Claude Code agent
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
Switch AI personalities with fuzzy matching:
```bash
# Using custom command
/mode architect    # Exact match
/mode eng         # Fuzzy match → engineer
/mode apm         # Acronym → autonomous-project-manager

# Or in prompts
mode: architect   # System design focus
mode: engineer    # Implementation focus
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
Direct access to Memento features in Claude Code:
```bash
# Mode management with fuzzy matching
/mode                    # List available modes
/mode architect         # Switch to architect mode
/mode eng              # Fuzzy match to engineer

# Ticket management
/ticket                 # List all tickets
/ticket my-feature      # Load ticket context

# Project status
/memento               # Show project overview
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
- **memento-routing**: Intelligent mode/workflow/ticket routing with fuzzy matching
- **security-guard**: Blocks dangerous commands and protects system
- **git-context-loader**: Auto-loads git status and project structure
- **project-overview**: Provides project context at session start
- **acronym-expander**: Expands project-specific terminology

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

### Custom Commands in Action
```bash
# Initialize Memento Protocol
npx memento-protocol init

# Custom commands are now available in Claude Code:

# Mode switching with fuzzy matching
/mode                  # Shows: architect, engineer, reviewer, etc.
/mode eng             # Switches to engineer mode
/mode apm             # Switches to autonomous-project-manager

# Ticket management
/ticket               # Lists all tickets
/ticket auth-feature  # Loads specific ticket context

# Project status
/memento             # Shows modes, workflows, tickets, configuration
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

## What's New in v0.7.0

- **Claude Code Agents**: Full subagent support with .claude/agents/ integration
- **Fuzzy Mode Matching**: Smart mode switching with acronym support
- **Enhanced Commands**: Improved custom command system with proper permissions
- **Better Hooks**: Modular hook architecture with focused responsibilities
- **GitHub Integration**: Automated CI/CD workflows for Claude Code projects

## License

MIT License - see [LICENSE](LICENSE) file for details.