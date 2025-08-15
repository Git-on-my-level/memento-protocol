# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

**Transform Claude Code from a basic AI assistant into a project-aware, context-intelligent development partner.**

## The Problem We Solve

Claude Code starts to break down as your codebase grows. You find yourself:
- Re-adding the same best practices to CLAUDE.md across projects
- Watching Claude spam markdown files instead of organized task tracking
- Seeing Claude go in circles after context compacting, repeating the same failed approaches
- Copy pasting the same roleplay prompts "Act as an engineer..." "Take on a QA role..." "Delegate to subagents..."

## Our Opinionated Solution

Memento Protocol adds an **opinionated meta-framework layer** on top of Claude Code that enforces:
- **Project context awareness** through hooks that remind Claude about project tasks
- **Structured task management** with tickets instead of scattered markdown files
- **Built-in AI modes** (architect, engineer, reviewer, etc...) with roleplay best practices
- **Automated workflows** so you can automate fuzzy but repetitive tasks (publish packages, security audit, etc...)

## Quick Start

```bash
# Initialize in your project
npx memento-protocol init

# Use enhanced Claude Code features
/mode architect           # Switch AI personality  
/ticket create "Add auth" # Create persistent task
/memento                  # Project status overview
```

## Key Features

- **AI Modes**: Switchable personalities (architect, engineer, reviewer) with smart fuzzy matching
- **Persistent Tickets**: Task tracking that survives Claude sessions with context injection
- **Smart Hooks**: Automated workflows triggered by Claude Code events (git context, acronym expansion)
- **Custom Commands**: Project-specific slash commands (/mode, /ticket, /memento)
- **Claude Code Agents**: Specialized subagents for research, analysis, and domain-specific tasks

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in 5 minutes
- [Component Guide](docs/COMPONENT_GUIDE.md) - Creating custom modes and workflows  
- [Hooks Guide](docs/HOOKS_GUIDE.md) - Automation and integration patterns
- [API Reference](docs/API.md) - Programmatic usage

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=git-on-my-level/memento-protocol&type=Timeline)](https://www.star-history.com/#git-on-my-level/memento-protocol&Timeline)


## License

MIT License - see [LICENSE](LICENSE) file for details.
