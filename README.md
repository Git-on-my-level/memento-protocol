# Memento Protocol: The zsh for Claude Code

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

**Transform Claude Code from a basic AI assistant into a project-aware, context-intelligent development powerhouse.**

## The Problem

Claude Code breaks down as your codebase grows:
- 😔 Re-adding the same CLAUDE.md instructions across projects
- 📝 Claude spams markdown files instead of organized task tracking
- 🔄 Goes in circles after context compacting, repeating failed approaches
- 🎭 Copy-pasting roleplay prompts: "Act as engineer..." "Be a reviewer..."

## The Solution: oh-my-zsh for AI

Just as zsh transformed terminals with themes and plugins, Memento Protocol transforms Claude Code with:

```bash
# Before: Basic Claude Code
"Please review my code"  # Generic responses

# After: With Memento Protocol
/mode reviewer          # Specialized AI personality
"Review the auth module" # Context-aware, focused analysis
```

## See It In Action

```bash
# 1. Install (30 seconds)
npx memento-protocol init

# 2. Use enhanced features immediately
/mode architect         # Switch to system design mode
/ticket create "Add authentication"  # Persistent task tracking
/memento               # See project status

# 3. Claude becomes context-aware
"Implement the auth feature"  # Claude knows about your ticket, 
                              # project structure, git status, etc.
```

## Core Features

| **Feature** | **What It Does** | **zsh Equivalent** |
|------------|------------------|-------------------|
| **AI Modes** | Switch personalities (architect/engineer/reviewer) | Themes |
| **Tickets** | Persistent task tracking across sessions | tmux sessions |
| **Fuzzy Matching** | `/mode eng` → finds `engineer` | Smart completions |
| **Hooks** | Auto-load context, expand acronyms | precmd/preexec |
| **Workflows** | Reusable procedures (review, deploy, audit) | Functions |
| **Agents** | Specialized tools (research, analysis) | Plugins |

## Quick Start

### Basic Setup
```bash
npx memento-protocol init
```

### With Recommendations
```bash
npx memento-protocol init --all-recommended
```

### Global Install
```bash
npm install -g memento-protocol
memento init
```

## Daily Workflow

```bash
# Morning: Architecture & Planning
/mode architect
"Design the payment system"

# Afternoon: Implementation  
/mode engineer
"Implement stripe integration"

# Evening: Review
/mode reviewer
"Check for security issues"

# Track Everything
/ticket list                    # See all tasks
/ticket view payment-system     # Load full context
```

## Why It Works

**Problem**: Claude Code loses context and repeats mistakes  
**Solution**: Persistent tickets + smart hooks = continuous context

**Problem**: Same prompts copy-pasted everywhere  
**Solution**: Built-in modes with best practices baked in

**Problem**: Scattered markdown files everywhere  
**Solution**: Organized ticket system with clear status tracking

## Documentation

- 📚 [Installation Guide](docs/INSTALLATION.md) - Detailed setup instructions
- 🚀 [Quick Start](docs/QUICKSTART.md) - Get running in 5 minutes
- 🎨 [Creating Modes](docs/MODES.md) - Build custom AI personalities
- 🔧 [Workflows](docs/WORKFLOWS.md) - Automate complex tasks
- 🪝 [Hooks Guide](docs/HOOKS.md) - Event-driven automation
- 📖 [API Reference](docs/API.md) - Programmatic usage

## Examples

### Switch Modes with Fuzzy Matching
```bash
/mode arc      # → architect
/mode eng      # → engineer  
/mode apm      # → autonomous-project-manager
```

### Create and Track Tasks
```bash
/ticket create "Add user authentication"
/ticket move auth-task in-progress
/ticket resolve auth-task
```

### Auto-Expand Acronyms
```bash
memento acronym add API "Application Programming Interface"
memento acronym add DDD "Domain-Driven Design"
# Now Claude automatically understands your project's terminology
```

## Philosophy

Like zsh enhances bash without replacing it, Memento Protocol enhances Claude Code while preserving everything that works. Start simple, add power as needed.

## Coming Soon

- 📦 **Starter Packs**: Frontend/Backend/DevOps bundles (like oh-my-zsh themes)
- 🌍 **Community Hub**: Share modes and workflows
- 📝 **.mementorc**: Global config file (like .zshrc)
- 🔌 **Plugin Manager**: Easy install/update (like zplug)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=git-on-my-level/memento-protocol&type=Timeline)](https://www.star-history.com/#git-on-my-level/memento-protocol&Timeline)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

- 🐛 [Issues](https://github.com/git-on-my-level/memento-protocol/issues)
- 💬 [Discussions](https://github.com/git-on-my-level/memento-protocol/discussions)
- 📖 [Wiki](https://github.com/git-on-my-level/memento-protocol/wiki)

## License

MIT © Memento Protocol Contributors

---

<div align="center">
<strong>⭐ Star us if this solved your Claude Code problems!</strong><br>
<em>Transform your AI coding experience in 30 seconds</em>
</div>