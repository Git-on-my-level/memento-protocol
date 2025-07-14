# Memento Protocol

A lightweight meta-framework for Claude Code that creates intelligent project context through minimal configuration.

## What is Memento Protocol?

Memento Protocol enhances Claude Code's understanding of your project by providing:
- **Modes**: AI personalities optimized for specific tasks (architect, engineer, reviewer)
- **Workflows**: Reusable procedures for common development patterns
- **Language Overrides**: Language-specific enhancements
- **State Management**: Ticket-based task tracking

All through a simple `CLAUDE.md` file that acts as a minimal router.

## Quick Start

### Installation

```bash
# Using npm (recommended)
npm install -g memento-protocol

# Using npx (no installation required)
npx memento-protocol init

# Using git for development
git clone https://github.com/memento-protocol/memento-protocol.git
cd memento-protocol
npm install
npm link
```

### Initialize in Your Project

```bash
# Interactive setup
memento init

# Or with options
memento init --mode engineer --language typescript
```

This creates:
- `CLAUDE.md`: Your project's navigation guide for Claude
- `.memento/`: Framework directory (gitignored)

### Basic Usage

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

### `memento add <type> <name>`
Add components from the template repository.

```bash
# Add a mode
memento add mode project-manager

# Add a workflow
memento add workflow review

# Add language override
memento add language python
```

### `memento list [type]`
List available or installed components.

```bash
# List all components
memento list

# List specific type
memento list modes
memento list installed
```

### `memento ticket`
Manage development tickets with directory-based status tracking.

```bash
# Create a new ticket (placed in 'next' directory)
memento ticket create "Add user authentication" -d "Implement OAuth2"

# List tickets
memento ticket list                    # List active tickets (next + in-progress)
memento ticket list --status all       # List all tickets
memento ticket list --status closed    # List done tickets

# Move ticket between statuses
memento ticket move ticket-id next        # Move to next (backlog)
memento ticket move ticket-id in-progress # Start working on ticket
memento ticket move ticket-id done        # Mark as completed

# Shortcut commands
memento ticket resume ticket-id  # Move to in-progress
memento ticket close ticket-id   # Move to done

# Search tickets
memento ticket search "auth"

# Migrate existing tickets to new structure
memento ticket migrate
```

Tickets are organized in directories:
- `.memento/tickets/next/` - Backlog tickets
- `.memento/tickets/in-progress/` - Active work
- `.memento/tickets/done/` - Completed tickets

### `memento config`
Manage configuration.

```bash
# View current config
memento config

# Set a value
memento config set defaultMode engineer

# Get a value
memento config get templateRepo
```

### `memento update`
Update components and templates.

```bash
# Check for updates
memento update --check

# Update all components
memento update
```

## Examples for Claude Code

When using Claude Code with Memento Protocol, you can use natural language commands:

### Mode Switching
- "act as architect to design the database schema"
- "switch to engineer mode and implement the auth feature"
- "I need a project manager to help plan this sprint"
- "review this pull request as a senior engineer"

### Workflow Execution
- "execute review on the authentication module"
- "run the summarize workflow on src/"
- "perform a security-focused code review"
- "summarize the recent changes and create a report"

### Ticket Management
- "create ticket for implementing user dashboard"
- "show me all active tickets"
- "move ticket-001 to in-progress"
- "close the authentication ticket"

### Combined Commands
- "act as architect, design the API, then create tickets for each endpoint"
- "review this code and create tickets for any issues found"
- "summarize the codebase then act as PM to plan next steps"

## Creating Custom Components

### Custom Mode

Create a markdown file in `.memento/modes/`:

```markdown
# Mode: Senior Engineer

You are a senior software engineer with deep expertise in system design and code quality.

## Expertise
- Architecture patterns and best practices
- Performance optimization
- Security considerations
- Code review and mentoring

## Approach
1. Analyze requirements thoroughly
2. Consider edge cases and error handling
3. Write clean, maintainable code
4. Document complex logic
```

### Custom Workflow

Create a markdown file in `.memento/workflows/`:

```markdown
# Workflow: Feature Implementation

A structured approach to implementing new features.

## Steps
1. Review requirements and acceptance criteria
2. Design the solution architecture
3. Implement with test-driven development
4. Add comprehensive documentation
5. Perform self-review
6. Create pull request
```

## Best Practices

1. **Keep CLAUDE.md Minimal**: Let it be a router, not a knowledge base
2. **Use Tickets for State**: Track work progress through the ticket system
3. **Leverage Modes**: Switch modes based on the task at hand
4. **Customize for Your Project**: Add project-specific modes and workflows

## Troubleshooting

### CLAUDE.md not being recognized
- Ensure the file is in your project root
- Check that `.memento/` directory exists

### Components not loading
- Run `memento list installed` to verify installation
- Check component syntax in `.memento/` directory

### Permission errors
- Ensure you have write permissions in the project directory
- On macOS/Linux, you may need to use `sudo` for global installation

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.