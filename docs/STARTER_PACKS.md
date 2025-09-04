# Starter Packs Guide

**Starter Packs are curated bundles of modes, workflows, and agents that work together seamlessly.** Think of them as oh-my-zsh themes for Claude Code - they transform your AI development experience in seconds.

## Table of Contents

- [What Are Starter Packs?](#what-are-starter-packs)
- [Using Starter Packs](#using-starter-packs)
- [Available Packs](#available-packs)
- [Creating Custom Packs](#creating-custom-packs)
- [Pack Schema Reference](#pack-schema-reference)
- [Troubleshooting](#troubleshooting)

## What Are Starter Packs?

Starter packs solve the "blank project syndrome" - that overwhelming moment when you need to configure your AI assistant for a new project. Instead of manually selecting modes, workflows, and agents, you get a proven combination that works together.

### The oh-my-zsh Analogy

Just as oh-my-zsh transforms a basic shell into a powerful development environment with themes and plugins, starter packs transform Claude Code from a generic AI into a specialized development partner:

```bash
# Before: Manual setup
memento add mode component-engineer
memento add mode react-architect  
memento add workflow component-creation
memento add workflow state-management
# ... 10+ more steps

# After: One command
memento init --starter-pack frontend-react
```

### What's Included in a Pack?

Each starter pack can include:

- **Modes**: Specialized AI personalities for your project type
- **Workflows**: Step-by-step procedures for common tasks
- **Agents**: Claude Code subagents with specific capabilities
- **Hooks**: Automated behaviors and context loading
- **Custom Commands**: Project-specific slash commands
- **Configuration**: Default settings optimized for your workflow

## Using Starter Packs

### Interactive Installation

The easiest way to get started:

```bash
# Shows available packs and lets you choose
npx zcc init --starter-pack
```

This will:
1. Show you all available starter packs
2. Let you preview what each pack includes
3. Install your chosen pack with all components
4. Configure project settings automatically

### Direct Installation

If you know which pack you want:

```bash
# Install specific pack directly
npx zcc init --starter-pack frontend-react
```

### Non-Interactive Mode

For scripts and automation:

```bash
# Silent installation
npx zcc init --starter-pack frontend-react --non-interactive --force
```

### Adding to Existing Project

You can add a starter pack to a project that already has Memento Protocol installed:

```bash
# Add pack to existing setup
memento init --starter-pack backend-api --force
```

## Available Packs

### frontend-react

**Perfect for React-based frontend development**

```json
{
  "name": "frontend-react",
  "description": "Complete React frontend development setup with TypeScript support and best practices"
}
```

**Includes:**
- **Modes**: `component-engineer`, `react-architect`, `ui-reviewer`, `engineer`
- **Workflows**: `component-creation`, `state-management`, `style-system`, `review`
- **Agents**: `claude-code-research`, `file-content-analyzer`
- **Custom Commands**: `/component`, `/state`, `/styles`
- **Hooks**: Git context loading, project overview
- **Default Mode**: `component-engineer`

**Best For:**
- React applications
- TypeScript projects
- Component-driven development
- UI/UX focused projects

**Quick Start:**
```bash
npx zcc init --starter-pack frontend-react

# Then use enhanced commands
/component Button          # Create new component
/state global             # Set up state management
/styles tailwind          # Configure styling
/mode react-architect     # Switch to architecture planning
```

### backend-api *(Coming Soon)*

**Complete REST API development setup**

**Will Include:**
- **Modes**: `api-architect`, `backend-engineer`, `security-reviewer`
- **Workflows**: `api-design`, `database-modeling`, `testing-strategy`
- **Agents**: `database-analyzer`, `api-tester`

### fullstack *(Coming Soon)*

**End-to-end application development**

**Will Include:**
- All frontend-react components
- All backend-api components
- Additional integration workflows

### devops *(Coming Soon)*

**Infrastructure and deployment focused**

**Will Include:**
- **Modes**: `devops-engineer`, `infrastructure-architect`, `security-auditor`
- **Workflows**: `ci-cd-setup`, `deployment-strategy`, `monitoring-setup`

## Creating Custom Packs

### Pack Structure

Create a JSON file in `templates/starter-packs/` following this structure:

```json
{
  "name": "my-custom-pack",
  "version": "1.0.0",
  "description": "My custom development setup",
  "author": "your-name",
  "components": {
    "modes": [
      { "name": "my-mode", "required": true }
    ],
    "workflows": [
      { "name": "my-workflow", "required": false }
    ]
  }
}
```

### Step-by-Step Guide

1. **Plan Your Pack**
   ```bash
   # What modes do you need?
   memento list modes
   
   # What workflows would be useful?
   memento list workflows
   
   # What agents add value?
   memento list agents
   ```

2. **Create the Definition**
   ```bash
   # Create pack file
   touch templates/starter-packs/my-pack.json
   ```

3. **Define Components**
   ```json
   {
     "name": "python-data-science",
     "version": "1.0.0",
     "description": "Complete Python data science development setup",
     "author": "your-team",
     "category": "data",
     "components": {
       "modes": [
         { "name": "data-scientist", "required": true },
         { "name": "ml-engineer", "required": false }
       ],
       "workflows": [
         { "name": "data-exploration", "required": true },
         { "name": "model-training", "required": true }
       ]
     },
     "configuration": {
       "defaultMode": "data-scientist",
       "projectSettings": {
         "language": "python",
         "framework": "jupyter"
       }
     },
     "compatibleWith": ["python"],
     "postInstall": {
       "message": "Data Science pack installed! Use `/mode data-scientist` to start."
     }
   }
   ```

4. **Test Your Pack**
   ```bash
   # Validate schema
   memento validate-pack my-pack
   
   # Test installation
   memento init --starter-pack my-pack --dry-run
   ```

5. **Share Your Pack**
   - Submit a PR to the main repository
   - Or host in your own template repository
   - Include documentation and examples

### Pack Dependencies

Packs can depend on other packs:

```json
{
  "name": "advanced-frontend",
  "dependencies": ["frontend-react"],
  "components": {
    "modes": [
      { "name": "performance-optimizer" },
      { "name": "accessibility-auditor" }
    ]
  }
}
```

Dependencies are installed automatically in the correct order.

### Custom Configuration

Packs can set up project-specific settings:

```json
{
  "configuration": {
    "defaultMode": "component-engineer",
    "customCommands": {
      "deploy": {
        "description": "Deploy the application",
        "template": "/deploy [environment] - Deploy to [environment] using deployment workflow"
      }
    },
    "projectSettings": {
      "testFramework": "vitest",
      "buildTool": "vite"
    }
  }
}
```

### Hook Configuration

Enable specific hooks for your pack:

```json
{
  "hooks": [
    {
      "name": "git-context-loader",
      "enabled": true,
      "config": {
        "includeStatus": true,
        "includeRecentCommits": 3
      }
    }
  ]
}
```

## Pack Schema Reference

### Required Fields

```json
{
  "name": "string",           // Unique identifier (kebab-case)
  "version": "string",        // Semantic version (1.0.0)
  "description": "string",    // Human-readable description
  "author": "string",         // Author or organization
  "components": {}            // Component definitions
}
```

### Optional Fields

```json
{
  "tags": ["string"],                    // Tags for discovery
  "category": "frontend|backend|...",    // Primary category
  "mementoProtocolVersion": "string",    // Minimum required version
  "configuration": {},                   // Default settings
  "hooks": [],                          // Hook configurations  
  "dependencies": ["string"],           // Pack dependencies
  "compatibleWith": ["string"],         // Project types
  "postInstall": {}                     // Post-installation actions
}
```

### Component Definition

```json
{
  "components": {
    "modes": [
      {
        "name": "string",              // Component name
        "required": boolean,           // Installation requirement (default: true)
        "customConfig": {}             // Component-specific overrides
      }
    ],
    "workflows": [/* same structure */],
    "agents": [/* same structure */]
  }
}
```

### Categories

- `frontend`: React, Vue, Angular, web UI
- `backend`: APIs, servers, databases  
- `fullstack`: End-to-end applications
- `devops`: Infrastructure, deployment, monitoring
- `mobile`: iOS, Android, React Native
- `ai-ml`: Machine learning, AI development
- `data`: Data science, analytics, ETL
- `general`: Language-agnostic or multi-purpose

### Project Types

- `javascript`, `typescript`: JavaScript ecosystems
- `react`, `vue`, `angular`: Frontend frameworks
- `node`: Node.js backend
- `python`: Python development
- `java`, `go`, `rust`: System languages
- `php`, `ruby`: Web languages
- `generic`: Works with any project

## Troubleshooting

### Common Issues

**Pack Not Found**
```bash
# List available packs
memento list --starter-packs

# Check pack name spelling
memento init --starter-pack frontend-react  # ✓ Correct
memento init --starter-pack react-frontend  # ✗ Wrong
```

**Component Missing**
```bash
# Pack references a component that doesn't exist
# Solution: Check available components
memento list modes
memento list workflows
memento list agents
```

**Dependency Conflicts**
```bash
# Multiple packs with conflicting settings
# Solution: Use --force to override
memento init --starter-pack new-pack --force
```

**Schema Validation Errors**
```bash
# Invalid pack definition
# Solution: Validate against schema
memento validate-pack my-pack --verbose
```

### Getting Help

**Debug Mode**
```bash
# Get detailed installation logs
memento init --starter-pack frontend-react --verbose
```

**Dry Run**
```bash
# See what would be installed without making changes
memento init --starter-pack frontend-react --dry-run
```

**Manual Inspection**
```bash
# View pack contents
cat templates/starter-packs/frontend-react.json

# Check installed components
ls .zcc/modes/
ls .zcc/workflows/
```

### Advanced Scenarios

**Multiple Environments**
```bash
# Different packs for different environments
memento init --starter-pack frontend-react    # Development
memento init --starter-pack testing --force   # Add testing setup
```

**Custom Overrides**
```bash
# Install pack then customize
memento init --starter-pack frontend-react
memento add mode my-custom-mode
memento config set defaultMode my-custom-mode
```

**Pack Updates**
```bash
# Update to newer pack version
memento update --starter-pack frontend-react
```

## Next Steps

- Explore [MODES.md](MODES.md) to understand AI personalities
- Read [WORKFLOWS.md](WORKFLOWS.md) for automation patterns  
- Check [HOOKS_GUIDE.md](HOOKS_GUIDE.md) for advanced automation
- Join discussions about new pack ideas
- Contribute your own pack definitions

---

*Starter packs are the fastest way to transform Claude Code into a specialized development partner. Choose a pack that matches your project, install in seconds, and start coding with an AI that understands your stack.*