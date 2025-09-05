# zcc: The zsh for Claude Code

[![npm version](https://badge.fury.io/js/zcc.svg)](https://badge.fury.io/js/zcc)

**Transform Claude Code from a basic AI assistant into a project-aware, context-intelligent development powerhouse.**

## The Problem

Claude Code breaks down as your codebase grows:
- 😔 Re-adding the same CLAUDE.md instructions across projects
- 📝 Claude spams markdown files instead of organized task tracking
- 🔄 Goes in circles after context compacting, repeating failed approaches
- 🎭 Copy-pasting roleplay prompts: "Act as engineer..." "Be a reviewer..."

## The Solution: oh-my-zsh for AI

Just as zsh transformed terminals with themes and plugins, zcc transforms Claude Code with:

```bash
# Before: Basic Claude Code
"Please review my code"  # Generic responses

# After: With zcc
/mode reviewer          # Specialized AI personality
"Review the auth module" # Context-aware, focused analysis
```

## See It In Action

```bash
# 1. Install (30 seconds)
npx zcc init

# 2. Use enhanced features immediately
/mode architect         # Switch to system design mode
/ticket create "Add authentication"  # Persistent task tracking
/zcc                    # See project status

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
npx zcc init
```

### With Recommendations
```bash
npx zcc init --all-recommended
```

### Global Install
```bash
npm install -g zcc
zcc init
```

## Starter Packs: Ready-to-Use Bundles

Get up and running instantly with curated collections of modes, workflows, and agents:

```bash
# Install with automatic detection
npx zcc init --starter-pack

# Or specify a pack directly
npx zcc init --starter-pack frontend-react
```

### Available Packs

| Pack | Description | Includes |
|------|-------------|----------|
| **frontend-react** | Complete React development setup | `component-engineer`, `react-architect`, `ui-reviewer` modes + creation workflows |
| **advanced-code-refactoring** | AST-grep focused code refactoring | Advanced refactoring modes and workflows |

### Coming Soon
- **backend-api** - RESTful API development with `api-architect`, `backend-engineer`, `security-reviewer` modes
- **fullstack** - End-to-end development combining frontend and backend capabilities

*Just like oh-my-zsh themes transform your terminal experience, starter packs transform Claude Code for your project type.*

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

- 📦 [Starter Packs Guide](docs/STARTER_PACKS.md) - Ready-to-use bundles for different project types
- 🪝 [Hooks Guide](docs/HOOKS_GUIDE.md) - Event-driven automation
- 🧩 [Component Guide](docs/COMPONENT_GUIDE.md) - Creating modes, workflows, and agents
- 📖 [API Reference](docs/API.md) - Programmatic usage

### Coming Soon
- 📚 Installation Guide - Detailed setup instructions
- 🚀 Quick Start - Get running in 5 minutes  
- 🎨 Creating Modes - Build custom AI personalities
- 🔧 Workflows - Automate complex tasks

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
zcc acronym add API "Application Programming Interface"
zcc acronym add DDD "Domain-Driven Design"
# Now Claude automatically understands your project's terminology
```

## Philosophy

Like zsh enhances bash without replacing it, zcc enhances Claude Code while preserving everything that works. Start simple, add power as needed.

## Coming Soon

- 🌍 **Community Hub**: Share modes and workflows
- 📝 **~/.zcc/config.yaml**: Global config file (unified structure with project config)
- 🔌 **Plugin Manager**: Easy install/update (like zplug)
- 📊 **Analytics**: Track productivity and usage patterns

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=git-on-my-level/zcc&type=Timeline)](https://www.star-history.com/#git-on-my-level/zcc&Timeline)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

- 🐛 [Issues](https://github.com/git-on-my-level/zcc/issues)
- 💬 [Discussions](https://github.com/git-on-my-level/zcc/discussions)
- 📖 [Wiki](https://github.com/git-on-my-level/zcc/wiki)

## License

MIT © zcc Contributors

---

<div align="center">
<strong>⭐ Star us if this solved your Claude Code problems!</strong><br>
<em>Transform your AI coding experience in 30 seconds</em>
</div>