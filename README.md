# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol) [![Stargazers over time](https://starchart.cc/git-on-my-level/memento-protocol.svg?variant=adaptive)](https://starchart.cc/git-on-my-level/memento-protocol)

**Transform Claude Code from a basic AI assistant into a project-aware, context-intelligent development partner.**

## The Problem We Solve

Claude Code starts to break down as your codebase grows. You find yourself:
- Copy-pasting the same CLAUDE.md setup across projects
- Watching Claude spam markdown files instead of organized task tracking  
- Seeing Claude go in circles on complex fixes, repeating the same failed approaches

## Our Opinionated Solution

Memento Protocol adds an **opinionated meta-framework layer** on top of Claude Code that enforces:
- **Project context awareness** through intelligent routing and persistent state
- **Structured task management** with tickets instead of scattered markdown files
- **Specialized AI modes** (architect, engineer, reviewer) with fuzzy matching
- **Automated workflows** triggered by your development patterns

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

## License

MIT License - see [LICENSE](LICENSE) file for details.