# Memento Protocol

[![npm version](https://badge.fury.io/js/memento-protocol.svg)](https://badge.fury.io/js/memento-protocol)

A lightweight meta-framework for Claude Code that creates intelligent project context through minimal configuration.

## What is Memento Protocol?

Memento Protocol enhances Claude Code's understanding of your project by providing:
- **Modes**: AI personalities optimized for specific tasks (architect, engineer, reviewer)
- **Workflows**: Reusable procedures for common development patterns
- **Language Overrides**: Language-specific enhancements
- **State Management**: Ticket-based task tracking

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
npx memento-protocol init --non-interactive --modes architect,engineer --workflows review --default-mode architect
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

Once initialized, Claude Code will automatically use your CLAUDE.md file to understand:
- Project context and goals
- Available modes and workflows
- Current tickets and tasks

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

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.