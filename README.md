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

## Starter Packs: Ready-to-Use Bundles

Get up and running instantly with curated collections of modes, workflows, and agents:

```bash
# Install with automatic detection
npx memento-protocol init --starter-pack

# Or specify a pack directly
npx memento-protocol init --starter-pack frontend-react
```

### Available Packs

| Pack | Description | Includes |
|------|-------------|----------|
| **frontend-react** | Complete React development setup | `component-engineer`, `react-architect`, `ui-reviewer` modes + creation workflows |
| **backend-api** | RESTful API development | `api-architect`, `backend-engineer`, `security-reviewer` modes + testing workflows |
| **fullstack** | End-to-end development | Both frontend and backend capabilities combined |

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

- 📚 [Installation Guide](docs/INSTALLATION.md) - Detailed setup instructions
- 🚀 [Quick Start](docs/QUICKSTART.md) - Get running in 5 minutes
- 📦 [Starter Packs Guide](docs/STARTER_PACKS.md) - Ready-to-use bundles for different project types
- 🎨 [Creating Modes](docs/MODES.md) - Build custom AI personalities
- 🔧 [Workflows](docs/WORKFLOWS.md) - Automate complex tasks
- 🪝 [Hooks Guide](docs/HOOKS_GUIDE.md) - Event-driven automation
- 📖 [API Reference](docs/API.md) - Programmatic usage

## Testing Framework

Memento Protocol includes a comprehensive testing framework designed for modern TypeScript development. Write maintainable, consistent tests with powerful utilities and patterns.

### Key Features

- **🏗️ TestDataFactory**: Builder patterns for consistent test data creation
- **🎭 MockFactory**: Intelligent mock management with state tracking  
- **💥 ErrorScenarios**: Standardized error testing utilities
- **📊 TestCategories**: Test organization and metadata system
- **🧪 Testing Patterns**: AAA, GWT, table-driven, and integration patterns
- **📁 Filesystem Testing**: In-memory filesystem adapters for isolation
- **⚡ Quick Setup**: One-line test environment creation

### Quick Example

```typescript
import { createFullTestEnvironment, TestDataFactory } from '@/lib/testing';

describe('Config Management', () => {
  it('should load and validate configuration', async () => {
    const testEnv = await createFullTestEnvironment({
      name: 'Config test',
      filesystem: {
        '/project/.memento/config.json': JSON.stringify(
          TestDataFactory.config()
            .withProjectType('typescript')
            .withVersion('2.0.0')
            .build()
        )
      },
      mocks: ['fs', 'inquirer']
    });

    try {
      const config = await configManager.load('/project', testEnv.fs);
      expect(config.projectType).toBe('typescript');
      await testEnv.assert.fileExists('/project/.memento/config.json');
    } finally {
      await testEnv.cleanup();
    }
  });
});
```

### Documentation

- 📋 [**Testing Guide**](src/lib/testing/TESTING_GUIDE.md) - Comprehensive framework documentation  
- 🔄 [**Migration Template**](src/lib/testing/migrate-tests.template.ts) - Upgrade existing tests
- ✅ [**Integration Tests**](src/lib/testing/__tests__/testing.test.ts) - Real-world usage examples

The testing framework follows the same philosophy as Memento Protocol: enhance your development experience without complexity. Start simple, scale as needed.

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

- 🌍 **Community Hub**: Share modes and workflows
- 📝 **~/.memento/config.yaml**: Global config file (unified structure with project config)
- 🔌 **Plugin Manager**: Easy install/update (like zplug)
- 📊 **Analytics**: Track productivity and usage patterns

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