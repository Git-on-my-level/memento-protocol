# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

A lightweight meta-framework for Claude Code that creates intelligent project context through minimal configuration.

## What is Memento Protocol?

Memento Protocol enhances AI assistants' understanding of your project by providing:
- **Multi-Agent Support**: Works with Claude, Cursor, and Gemini CLI
- **Modes**: AI personalities optimized for specific tasks (architect, engineer, reviewer)
- **Workflows**: Reusable procedures for common development patterns
- **Language Overrides**: Language-specific enhancements
- **State Management**: Ticket-based task tracking

All through simple configuration files tailored to each AI assistant.

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

During setup, you'll be asked to:
- Select which AI agents to support (Claude, Cursor, Gemini)
- Choose modes and workflows to include
- Configure project-specific settings

You can also initialize with options, for example:
```bash
npx memento-protocol init --mode engineer --language typescript
```

This will create:
- Agent-specific configuration files (e.g., `CLAUDE.md`, `.cursorrules`, `GEMINI.md`)
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

Once initialized, your AI assistants will automatically use their respective configuration files to understand:
- Project context and goals
- Available modes and workflows
- Current tickets and tasks

### Adding Additional Agents

If you've already initialized Memento Protocol and want to add support for another AI agent, use the `add-agent` command:

```bash
# Add a specific agent
memento add-agent cursor

# Add multiple agents interactively
memento add-agent

# Add all available agents
memento add-agent --all
```

## Commands

### `memento init`
Initialize Memento Protocol in your project.

```bash
memento init [options]

Options:
  -m, --mode <mode>         Initial mode (architect, engineer, etc.)
  -l, --language <lang>     Primary language
  -s, --skip-interactive    Skip interactive setup
```

### `memento add-agent`
Add support for additional AI agents to an existing Memento project.

```bash
memento add-agent [agent] [options]

Arguments:
  agent        Agent to add (claude, cursor, gemini)

Options:
  -f, --force  Force overwrite existing agent files
  -a, --all    Add all available agents
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.