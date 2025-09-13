# zcc Design Philosophy

## Core Concept: The zsh for Claude Code

zcc is designed around a powerful analogy: **We are to Claude Code what zsh is to bash.**

This isn't just a marketing tagline—it's our north star for every design decision. Just as zsh transformed the shell experience while remaining compatible with bash, zcc transforms Claude Code while preserving its core functionality.

## The zsh Philosophy Applied

### 1. Enhancement, Not Replacement

**zsh Principle**: zsh doesn't replace bash; it enhances it. Bash scripts still work, but you get so much more.

**zcc Application**:
- Claude Code continues to work exactly as before
- We add layers of functionality on top
- Users can adopt features gradually

### 2. Themes Change Everything

**zsh Principle**: A theme isn't just colors—it transforms your entire prompt experience (robbyrussell vs powerlevel10k).

**zcc Application**:
- Modes are our themes
- Each mode completely changes Claude's personality and approach
- `architect` mode thinks big picture like powerlevel10k is feature-rich
- `engineer` mode is pragmatic like robbyrussell is minimal
- Users can switch modes as easily as changing themes

### 3. Plugins Are Power

**zsh Principle**: Plugins add focused capabilities. The git plugin adds git aliases, the docker plugin adds docker completions.

**zcc Application**:
- Agents are specialized plugins (claude-code-research = git plugin)
- Workflows are reusable functions (review workflow = custom function)
- Each component does one thing well
- Composable and modular

### 4. Configuration Cascade

**zsh Principle**: Configuration layers from system → global → local, each overriding the previous.

**zcc Application**:
```
1. Built-in defaults (like zsh defaults)
2. Global config ~/.zcc/config.yaml (like ~/.zshrc)
3. Project config .zcc/config.yaml (like project .envrc)
4. Environment variables (runtime overrides)
```

### 5. Smart Completions

**zsh Principle**: Intelligent tab completion that understands context and fuzzy matches.

**zcc Application**:
- Fuzzy mode matching: `eng` → `engineer`
- Acronym expansion: `apm` → `autonomous-project-manager`
- Context-aware suggestions
- Progressive matching (exact → substring → acronym)

### 6. Hooks Drive Automation

**zsh Principle**: Hooks like precmd, preexec, and chpwd enable powerful automation.

**zcc Application**:

| **zcc Hook**       | **zsh Equivalent** | **Purpose**                         |
| ------------------ | ------------------ | ----------------------------------- |
| user-prompt-submit | preexec            | Transform commands before execution |
| project-overview   | chpwd              | Load context on project switch      |
| git-context-loader | precmd             | Update context before prompts       |
| zcc-routing        | command-not-found  | Intelligent command routing         |

### 7. Community-Driven

**zsh Principle**: oh-my-zsh's success comes from community contributions.

**zcc Application**:
- Templates for building pack components
- Shareable configurations
- Future: Community hub for modes/workflows
- Future: oh-my-zcc starter packs

## Design Patterns

### The Plugin Pattern

Every component (mode, workflow, agent) follows the plugin pattern:
1. Self-contained definition
2. No dependencies on other components
3. Declarative configuration
4. Can be distributed independently

```typescript
// Like a zsh plugin
interface ZccComponent {
  name: string;           // Plugin name
  description: string;    // What it does
  metadata: {};          // Configuration
  content: string;       // Implementation
}
```

### The Theme Pattern

Modes work like themes—complete personality transformations:

```yaml
# Like a zsh theme definition
name: architect
prompt: "You think in systems and patterns..."
behavior:
  - Big picture focus
  - Design patterns emphasis
  - Scalability concerns
```

### The Hook Pattern

Event-driven automation without user intervention:

```javascript
// Like zsh's add-zsh-hook
registerHook({
  event: 'user-prompt-submit',
  handler: transformPrompt,
  priority: 10
});
```

## Implementation Guidelines

### 1. Always Think "How Would zsh Do This?"

When adding new features, ask:
- Is there a zsh equivalent?
- How does zsh solve this problem?
- Can we use similar terminology?

### 2. Progressive Enhancement

Users should be able to:
1. Start with basic installation
2. Add packs as needed
3. Customize gradually
4. Share configurations

### 3. Discoverability

Like `zsh<TAB>` shows all zsh commands:
- `zcc pack list` shows available starter packs
- `/mode<TAB>` should show available modes (future)
- Clear, predictable naming

### 4. Sensible Defaults

Like zsh works great out-of-the-box:
- Recommended packs on first install
- Smart project detection
- Automatic mode selection based on context

## System Architecture (zsh-Inspired)

### Directory Structure
```
project-root/
├── CLAUDE.md                    # Router (like .zshenv - always loaded)
└── .zcc/                    # Framework directory (like ~/.oh-my-zsh/)
    ├── config.yaml              # Configuration (like .zshrc)
    ├── modes/                   # AI personalities (like themes/)
    ├── workflows/               # Procedures (like functions/)
    ├── agents/                  # Specialized tools (like plugins/)
    ├── hooks/                   # Automation (like hook functions)
    ├── tickets/                 # Task tracking (like sessions)
    └── acronyms.json           # Expansions (like aliases)

.claude/                         # Claude Code specific
    ├── agents/                  # Installed subagents
    ├── commands/                # Custom slash commands
    └── settings.local.json     # Claude Code config
```

### Component Loading Order

Like zsh's initialization sequence:
1. CLAUDE.md loaded (always, like .zshenv)
2. Hook system initialized (like loading compinit)
3. Default mode activated (like setting ZSH_THEME)
4. Custom commands registered (like sourcing aliases)
5. Project context loaded (like .envrc)

### Lazy Loading Strategy

Like zsh's autoload:
- Components loaded only when needed
- Modes loaded on switch
- Workflows loaded on invocation
- Agents loaded on demand

## Future Roadmap (Inspired by zsh Evolution)

### Phase 1: Core Enhancement (Current)
- ✅ Basic mode system (themes)
- ✅ Fuzzy matching (completions)
- ✅ Hooks (automation)
- ✅ Custom commands (aliases)

### Phase 2: oh-my-zcc
- 📦 Starter packs (theme bundles)
- 🔧 .zccrc global config
- 🌍 Community repository
- 📚 Pack marketplace

### Phase 3: Power Tools
- 🎨 Visual configurator (like zsh config tools)
- 🔌 Plugin manager (like zplug/zinit)
- 📊 Performance profiling
- 🔄 Auto-updates

### Phase 4: Ecosystem
- 🤝 Integration with other AI tools
- 📱 Web-based configuration
- 🎯 Project-type detection and auto-config
- 🌐 Shared team configurations

## Component Design Principles

### Modes (Themes)
- Each mode is a complete personality
- Modes should be discoverable by behavior
- Names should indicate function (architect, engineer, reviewer)
- Support abbreviations and fuzzy matching

### Workflows (Functions)
- Single-purpose, reusable procedures
- Clear input/output expectations
- Composable with other workflows
- Version controlled for stability

### Agents (Plugins)
- Focused on one capability
- Self-documenting
- No side effects
- Clear tool permissions

### Hooks (Automation)
- Event-driven, not polling
- Fast execution (don't block)
- Graceful failure
- User-visible logging

## Testing Philosophy

Like zsh's robust testing:
1. Unit tests for each component
2. Integration tests for component interaction
3. E2E tests for user workflows
4. Performance benchmarks

## Documentation Standards

### For Users
- Start with "It's like [zsh feature] but for Claude Code"
- Use familiar terminology
- Provide migration guides from basic Claude Code
- Show before/after examples

### For Contributors
- Explain the zsh parallel
- Provide templates
- Document the plugin API
- Show example implementations

## Success Metrics

We measure success by:
1. **Adoption**: "As obvious as switching from bash to zsh"
2. **Customization**: Average number of custom components per user
3. **Sharing**: Components shared in community
4. **Retention**: Users who keep using after 30 days
5. **Performance**: No noticeable slowdown vs vanilla Claude Code

## Design Anti-Patterns to Avoid

### Don't Break Claude Code
Never interfere with core Claude Code functionality. Enhancement only.

### Don't Overcomplicate
If zsh wouldn't need it, we probably don't either.

### Don't Lock Users In
Everything should be removable/reversible. No vendor lock-in.

### Don't Assume Expertise
Work for beginners with defaults, power users with customization.

## CLI Tool Responsibilities (Like oh-my-zsh Installer)

### Setup Phase
1. Initialize `.zcc/` directory structure (like ~/.oh-my-zsh/)
2. Install selected packs (like choosing plugin bundles)
3. Configure hooks and integrations (like enabling features)
4. Generate CLAUDE.md router (like updating .zshrc)

### Maintenance Phase
1. Install/remove packs (`zcc pack install/uninstall`)
2. Update packs (`zcc pack update`)
3. Validate integrity (`zcc doctor`)
4. Manage tickets (`zcc ticket`)

### Discovery Phase
1. List available packs (`zcc pack list`)
2. Show pack details (`zcc pack show <name>`)
3. Install pack during init (`zcc init -p <name>`)
4. Uninstall pack (`zcc pack uninstall <name>`)

## The Ultimate Vision

**zcc becomes to Claude Code what oh-my-zsh became to zsh:**
- The default enhancement everyone installs
- A thriving ecosystem of packs
- Community-driven development
- The obvious choice for serious users

When someone starts using Claude Code, installing zcc should feel as natural and necessary as installing oh-my-zsh when setting up a new shell.

## Technical Implementation Notes

### Token Efficiency
- CLAUDE.md remains minimal (< 200 lines)
- Pack components loaded on-demand
- Smart caching of frequently used components

### State Management
- Tickets provide session continuity
- Git integration for versioning
- Clean separation of concerns

### Extensibility
- Plugin API for third-party packs
- Theme inheritance system
- Hook priority system

### Performance
- Lazy loading everything
- Minimal overhead on Claude Code
- Fast mode switching

---

*"Make Claude Code work YOUR way"* - This is our promise, delivered through the proven patterns that made zsh the developer's choice for shell enhancement.