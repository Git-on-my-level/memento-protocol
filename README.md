# Memento Protocol: The zsh for Claude Code

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

**Transform Claude Code from a basic shell into a power tool.** Just as zsh revolutionized the terminal experience with oh-my-zsh, themes, and plugins, Memento Protocol transforms Claude Code into a highly customizable, intelligent development environment.

## The "Aha" Moment

Remember when you first switched from bash to zsh? That feeling when your terminal suddenly became smart, beautiful, and powerful? **That's what Memento Protocol does for Claude Code.**

```bash
# Before: Basic Claude Code
Claude helps with code...

# After: Claude Code + Memento Protocol  
Claude becomes YOUR personalized AI team with:
- Switchable personalities (like zsh themes)
- Smart completions and fuzzy matching
- Custom commands and workflows
- Automated context management
- Plugin-style extensibility
```

## What You Get

| **zsh Feature** | **Memento Protocol Equivalent** | **What It Does** |
|-----------------|----------------------------------|------------------|
| **Themes** | **Modes** | Switch AI personality: architect → engineer → reviewer |
| **Plugins** | **Agents & Workflows** | Specialized capabilities: research, analysis, code review |
| **Aliases** | **Custom Commands** | `/mode`, `/ticket`, `/memento` - your project shortcuts |
| **Hooks** | **Smart Hooks** | Auto-routing, context loading, git integration |
| **Completions** | **Fuzzy Matching** | Type `apm` → finds `autonomous-project-manager` |
| **.zshrc** | **.memento/config** | Your personalized AI configuration |
| **oh-my-zsh** | **Component Library** | Pre-built modes, workflows, and agents |

## When You Need This

✅ You keep copy-pasting the same CLAUDE.md instructions across projects  
✅ Claude Code gets confused in large codebases  
✅ You want Claude to work YOUR way, not the default way  
✅ You wish Claude had different "modes" for different tasks  
✅ You want to share your Claude Code setup with your team

## Quick Start: From Zero to Power User

### 1. The One-Liner (Like Installing oh-my-zsh)

```bash
# Transform Claude Code in seconds
npx memento-protocol init --all-recommended
```

**What just happened?** You've installed:
- 🎨 Multiple AI modes (architect, engineer, reviewer)
- 🔧 Smart workflows for common tasks
- 🤖 Specialized agents for enhanced capabilities
- ⚡ Custom commands that work instantly
- 🪝 Hooks that automate your workflow

### 2. Choose Your Flavor

```bash
# Interactive setup (like zsh's first-run wizard)
npx memento-protocol init

# Start with a specific mode (like choosing a zsh theme)
npx memento-protocol init --mode engineer --language typescript
```

### 3. Switch Modes On-the-Fly

```bash
# In Claude Code, after installation:
/mode architect    # Big picture thinking
/mode engineer     # Implementation focus
/mode reviewer     # Code quality checks
/mode apm         # Fuzzy match → autonomous-project-manager
```

### 4. Advanced Setup Options

```bash
# Automated setup (perfect for CI/CD)
npx memento-protocol init --non-interactive \
  --modes architect,engineer \
  --workflows review \
  --default-mode architect

# Update existing setup (like updating oh-my-zsh)
npx memento-protocol update

# List available components (like browsing zsh plugins)
npx memento-protocol list --available
```

## What Gets Installed

Just like zsh creates `~/.zshrc` and `~/.oh-my-zsh/`, Memento Protocol creates:

```
Your Project/
├── .memento/              # Your Memento configuration (like .oh-my-zsh/)
│   ├── config.json        # Settings (like .zshrc)
│   ├── modes/             # AI personalities (like themes/)
│   ├── workflows/         # Reusable procedures (like plugins/)
│   └── tickets/           # Task tracking
└── .claude/               # Claude Code integration
    ├── agents/            # Specialized capabilities
    ├── commands/          # Your custom slash commands
    └── settings.json      # Claude Code config
```

## Installation Options

### Try It First (Recommended)
```bash
# No commitment, just like trying zsh before installing
npx memento-protocol init
```

### Global Installation
```bash
# Install globally for the 'memento' command
npm install -g memento-protocol

# Now use it anywhere
memento init
memento add mode my-custom-mode
memento list --installed
```

### Developer Setup
```bash
# Contributing? Fork and clone:
git clone https://github.com/git-on-my-level/memento-protocol.git
cd memento-protocol
npm install
npm link  # Use your local version globally
```

## How It Works

### Instant Power-Up
Once installed, Claude Code automatically:
- 🧠 **Becomes context-aware** through intelligent hooks
- 🎯 **Responds to your commands** via `/mode`, `/ticket`, `/memento`
- 🔍 **Finds what you mean** with fuzzy matching
- 🚀 **Loads specialized capabilities** through agents and workflows

### Daily Workflow

```bash
# Morning: Start with architecture
/mode architect
"Design a caching system for our API"

# Afternoon: Switch to implementation
/mode engineer  
"Implement the cache with Redis"

# Evening: Review everything
/mode reviewer
"Check my changes for issues"

# Track your work
/ticket create "Implement caching system"
/ticket move in-progress
```

## Core Features

### Modes: Your AI Personalities

Think of modes as zsh themes, but for AI behavior:

```bash
# Switch personalities like switching zsh themes
/mode architect     # Big-picture thinking (like powerlevel10k)
/mode engineer      # Get things done (like robbyrussell)
/mode reviewer      # Quality focus (like agnoster)
/mode educator      # Teaching mode (like terminalparty)

# Fuzzy matching = Smart completions
/mode eng          # → finds 'engineer'
/mode apm          # → finds 'autonomous-project-manager'
/mode arc          # → finds 'architect'
```

**Each mode completely changes how Claude Code thinks and responds.**

### Tickets: Persistent Task Memory

Unlike bash history that forgets, Memento remembers:

```bash
# Create a ticket (like creating a tmux session)
/ticket create "Implement user authentication"

# Track progress
/ticket move <id> in-progress
/ticket move <id> done

# Load context anytime
/ticket view <id>  # Claude remembers everything about this task

# See your work
/ticket list --status in-progress
```

**Tickets = Persistent context that survives across Claude Code sessions**

### Workflows: Your Playbooks

Like zsh functions, but for AI tasks:

```bash
# Trigger complex procedures with simple commands
"Run the code review workflow"      # Full review process
"Execute the API design workflow"   # Structured API creation
"Start the refactoring workflow"    # Systematic improvements

# Workflows = Reusable, battle-tested procedures
```

### Agents: Specialized Plugins

Like zsh plugins that add specific capabilities:

```bash
# Built-in agents (like oh-my-zsh bundled plugins)
claude-code-research    # The 'git' plugin for Claude Code docs
session-summarizer      # The 'history' plugin for work tracking  
file-content-analyzer   # The 'extract' plugin for large files

# Community agents coming soon (like awesome-zsh-plugins)
```

**Agents = Focused tools that do one thing really well**

### Managing Components

Just like managing zsh plugins:

```bash
# Browse available components (like oh-my-zsh wiki)
memento list --available

# Install new capabilities
memento add mode my-custom-mode      # Add a personality
memento add workflow code-review     # Add a procedure
memento add agent researcher         # Add specialized skills

# See what's installed
memento list --installed

# Update everything
memento update
```

## Power User Features

### Hooks: Automation Magic

Like zsh hooks (precmd, chpwd), but for AI interactions:

| **Hook** | **zsh Equivalent** | **What It Does** |
|----------|-------------------|------------------|
| **memento-routing** | `preexec` | Routes requests to right mode automatically |
| **project-overview** | `chpwd` | Loads context when switching projects |
| **git-context-loader** | `precmd` | Shows git status in prompts |
| **acronym-expander** | `alias-expansion` | Expands your project's terminology |
| **user-prompt-submit** | `zle widget` | Transforms input before processing |

```bash
# Hooks run automatically, making Claude Code smarter without you thinking about it
```

### Configuration Hierarchy

Like zsh's config loading order:

```bash
1. Built-in defaults              # Like zsh defaults
2. ~/.memento/config.json          # Like ~/.zshrc
3. .memento/config.json            # Like .envrc (project-specific)
4. Environment variables           # Runtime overrides
```

**Your project config overrides global, just like local .zshrc overrides global.**

## Your Memento Setup

```bash
Your-Project/
│
# Memento Config (like ~/.oh-my-zsh/)
├── .memento/
│   ├── config.json        # Your .zshrc equivalent
│   ├── modes/            # Your themes
│   ├── workflows/        # Your plugins  
│   ├── tickets/          # Your persistent sessions
│   └── hooks/            # Your automation
│
# Claude Code Integration
└── .claude/
    ├── agents/           # Specialized capabilities
    ├── commands/         # Your slash commands
    └── settings.json     # Claude Code config
```

## Command Reference

### Core Commands (like zsh builtins)

```bash
memento init              # Initial setup (like oh-my-zsh installer)
memento update            # Update everything (like upgrade_oh_my_zsh)
memento list              # Browse components (like plugin list)
memento add               # Install components (like adding plugins)
```

### In Claude Code (your new superpowers)

```bash
/mode [name]              # Switch personality (like changing theme)
/ticket [action]          # Manage tasks (like job control)
/memento                  # Show status (like neofetch for AI)
```

### Full CLI Reference

```bash
# Setup & Management
memento init [options]              # Setup wizard
memento update                      # Update all components
memento config get/set              # Manage settings

# Components
memento add <type> <name>           # Install mode/workflow/agent
memento list --available            # Browse library
memento list --installed            # See what you have

# Tickets
memento ticket create <title>       # Start tracking work
memento ticket move <id> <status>   # Update progress
memento ticket list                 # View all tickets

# Commands
memento command install             # Setup slash commands
memento command check               # Verify installation

# Acronyms
memento acronym add api "Application Programming Interface"
memento acronym list                # List all acronyms
memento acronym remove api          # Remove an acronym

# Hooks
memento hook list                   # List configured hooks
memento hook add <name>             # Add hook from template
memento hook enable/disable <id>   # Toggle hooks
```

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
memento update
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

## The Philosophy

**Memento Protocol follows the zsh philosophy:**
- **Enhance, don't replace**: We make Claude Code better, not different
- **Composable components**: Mix and match modes, workflows, and agents
- **Sensible defaults**: Works great out-of-the-box
- **Infinite customization**: Make it yours
- **Community-driven**: Share your setups and components

## Coming Soon

- 📦 **Starter Packs**: oh-my-memento with themed collections (Frontend Pack, Backend Pack, DevOps Pack)
- 🌍 **Community Hub**: Share your modes and workflows
- 🎨 **Visual Configurator**: GUI for managing your setup
- 🔌 **Plugin Marketplace**: Discover and install community components
- 📝 **.mementorc**: Global config file (like .zshrc)

## Documentation

- [Component Guide](docs/COMPONENT_GUIDE.md) - Creating custom modes and workflows
- [Hooks Guide](docs/HOOKS_GUIDE.md) - Complete hook system documentation
- [API Reference](docs/API.md) - Programmatic usage
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## What's New in v0.7.0

- **Claude Code Agents**: Full subagent support with .claude/agents/ integration
- **Fuzzy Mode Matching**: Smart mode switching with acronym support
- **Enhanced Commands**: Improved custom command system with proper permissions
- **Better Hooks**: Modular hook architecture with focused responsibilities
- **GitHub Integration**: Automated CI/CD workflows for Claude Code projects

## Contributing

Join us in building the ultimate Claude Code enhancement platform! See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

- 🐛 [Report Issues](https://github.com/git-on-my-level/memento-protocol/issues)
- 📖 [Documentation](https://github.com/git-on-my-level/memento-protocol/wiki)
- 💬 [Discussions](https://github.com/git-on-my-level/memento-protocol/discussions)

## License

MIT © Memento Protocol Contributors

---

<div align="center">
<strong>Memento Protocol</strong><br>
<em>The zsh for Claude Code - Because your AI assistant should work YOUR way.</em><br><br>
🌟 Star us on GitHub if this gave you that "aha" moment!
</div>