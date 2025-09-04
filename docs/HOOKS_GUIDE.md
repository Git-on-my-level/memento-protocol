# Claude Code Hooks Guide

This guide explains the enhanced hook system in Memento Protocol, which provides powerful automation and customization capabilities for Claude Code.

## Overview

The hook system allows you to:
- Execute custom scripts at specific Claude Code events
- Filter and modify user prompts before processing
- Validate and block dangerous operations
- Automate common development tasks
- Integrate with external tools and services

## Hook Events

### UserPromptSubmit
Triggered when a user submits a prompt. Can modify the prompt or block execution.

### PreToolUse
Triggered before Claude uses a tool (Write, Edit, Bash, etc.). Can validate or block tool usage.

### PostToolUse
Triggered after a tool completes successfully. Useful for automation like formatting or testing.

### SessionStart
Triggered when a new Claude Code session begins. Perfect for loading context.

### Other Events
- `Stop`: When Claude finishes responding
- `SubagentStop`: When a subagent completes
- `PreCompact`: Before context reduction
- `Notification`: On system notifications

## Hook Configuration

Hooks are defined in JSON files in `.zcc/hooks/definitions/`:

```json
{
  "version": "1.0.0",
  "hooks": [
    {
      "id": "my-hook",
      "name": "My Custom Hook",
      "description": "Description of what this hook does",
      "event": "UserPromptSubmit",
      "enabled": true,
      "matcher": {
        "type": "keyword",
        "pattern": "+test -skip"
      },
      "command": "./my-script.sh",
      "priority": 100,
      "continueOnError": true,
      "timeout": 30000
    }
  ]
}
```

## Matchers

Matchers determine when hooks should run:

### Regex Matcher
```json
{
  "type": "regex",
  "pattern": "^(test|spec)\\s+"
}
```

### Exact Matcher
```json
{
  "type": "exact",
  "pattern": "run tests"
}
```

### Keyword Matcher
Supports required (+), excluded (-), and optional (?) keywords:
```json
{
  "type": "keyword",
  "pattern": "+ticket +create -delete ?auth"
}
```

### Fuzzy Matcher
Matches with typo tolerance and partial matches:
```json
{
  "type": "fuzzy",
  "pattern": "run tests|execute tests",
  "confidence": 0.8
}
```

### Tool Matcher
For PreToolUse/PostToolUse hooks:
```json
{
  "type": "tool",
  "pattern": "Write,Edit,MultiEdit"
}
```

## Hook Commands

### Using Templates

Memento Protocol includes pre-built hook templates:

```bash
# List available templates
memento hook templates

# Add a hook from template
memento hook add acronym-expander
memento hook add git-context-loader
```

### Managing Hooks

```bash
# List all hooks
memento hook list

# Enable/disable hooks
memento hook enable my-hook
memento hook disable my-hook

# Remove a hook
memento hook remove my-hook
```

### Creating Custom Hooks

1. Create a hook definition file:
```bash
cat > .zcc/hooks/definitions/my-hook.json << 'EOF'
{
  "version": "1.0.0",
  "hooks": [{
    "id": "my-custom-hook",
    "name": "My Custom Hook",
    "event": "PostToolUse",
    "enabled": true,
    "matcher": {
      "type": "regex",
      "pattern": "\\.(js|ts)$"
    },
    "command": "./.zcc/hooks/scripts/my-script.sh"
  }]
}
EOF
```

2. Create the script:
```bash
mkdir -p .zcc/hooks/scripts
cat > .zcc/hooks/scripts/my-script.sh << 'EOF'
#!/bin/bash
echo "File modified: $HOOK_TOOL_ARG_FILE_PATH"
# Your custom logic here
EOF
chmod +x .zcc/hooks/scripts/my-script.sh
```

3. Regenerate hook configuration:
```bash
memento
```

## Environment Variables

Hooks receive context through environment variables:

- `HOOK_EVENT`: The event that triggered the hook
- `HOOK_PROJECT_ROOT`: Project root directory
- `HOOK_TIMESTAMP`: Event timestamp
- `HOOK_SESSION_ID`: Claude Code session ID
- `HOOK_TOOL`: Tool name (for tool-related events)
- `HOOK_TOOL_ARG_*`: Tool arguments (e.g., `HOOK_TOOL_ARG_FILE_PATH`)

## Exit Codes

- `0`: Success
- `1`: Error (hook failed)
- `2`: Block execution (for UserPromptSubmit and PreToolUse)

## Built-in Hook Templates

### git-context-loader  
Loads git status and project structure at session start.

### git-context-loader  
Loads git status and project structure at session start.

### acronym-expander
Automatically expands configured acronyms in user prompts. Configured acronyms are stored in `.zcc/acronyms.json` and managed via `memento acronym` commands.

## Examples

### Security Hook
Block dangerous commands:
```json
{
  "id": "security",
  "name": "Security Guard",
  "event": "UserPromptSubmit",
  "matcher": {
    "type": "regex",
    "pattern": "\\b(sudo|su|doas)\\b"
  },
  "command": "echo 'BLOCKED: Super-user commands are not allowed for safety.' >&2 && exit 2"
}
```

### Acronym Expansion
Automatically expand project-specific acronyms:
```bash
# Configure acronyms
memento acronym add api "Application Programming Interface"
memento acronym add k8s "Kubernetes"

# Add the hook
memento hook add acronym-expander

# Now when you say "Deploy the api to k8s", Claude sees:
# ## Acronym Glossary
# - **API**: Application Programming Interface
# - **K8S**: Kubernetes
# 
# ---
# 
# Deploy the api to k8s
```

### File Change Logger
Log file modifications:
```json
{
  "id": "file-logger",
  "name": "File Change Logger",
  "event": "PostToolUse",
  "matcher": {
    "type": "tool",
    "pattern": "Write,Edit"
  },
  "command": "echo \"File modified: $HOOK_TOOL_ARG_FILE_PATH\" >> .zcc/file-changes.log",
  "continueOnError": true
}
```

### Context Loader
Load project info at session start:
```json
{
  "id": "context",
  "name": "Load Context",
  "event": "SessionStart",
  "command": "cat README.md && echo && git status"
}
```

### Command Logger
Log specific commands for audit:
```json
{
  "id": "command-logger",
  "name": "Command Logger",
  "event": "UserPromptSubmit",
  "matcher": {
    "type": "regex",
    "pattern": "\\b(deploy|publish|release)\\b"
  },
  "command": "echo \"[$(date)] Command requested: $HOOK_PROMPT\" >> .zcc/command-audit.log",
  "continueOnError": true
}
```

## Best Practices

1. **Use appropriate priorities**: Higher priority hooks run first (default: 0)
2. **Handle errors gracefully**: Use `continueOnError: true` for non-critical hooks
3. **Set reasonable timeouts**: Default is 30 seconds
4. **Test hooks thoroughly**: Use `memento hook list` to verify configuration
5. **Keep scripts fast**: Hooks run synchronously and can slow down Claude Code
6. **Use specific matchers**: Avoid running hooks unnecessarily
7. **Document your hooks**: Use clear names and descriptions

## Troubleshooting

### Hook not running
- Check if enabled: `memento hook list`
- Verify matcher pattern matches your use case
- Check script permissions: `chmod +x script.sh`
- Look for errors in Claude Code output

### Hook blocking unintentionally
- Exit code 2 blocks execution
- Ensure your script only exits with 2 when intended
- Use `continueOnError: true` for non-blocking hooks

### Performance issues
- Reduce hook timeout
- Make scripts async where possible
- Use specific matchers to reduce executions
- Disable unnecessary hooks

## Advanced Features

### Hook Chaining
Hooks with the same event run in priority order, allowing you to chain operations.

### Dynamic Hook Loading
Hooks are loaded from `.zcc/hooks/definitions/` at initialization, supporting hot-reloading by running `memento`.

### Custom Matchers
Extend the system by implementing new matcher types in the codebase.

### Hook Analytics
Track hook execution with custom logging in your scripts.

## Migration from Old System

The new hook system is backwards compatible. Your existing `.zcc/hooks/routing.sh` will continue to work. To migrate:

1. The routing hook is now built-in and automatically generated
2. Custom hooks should be defined in JSON format
3. Run `memento` to regenerate configuration

## Contributing

To contribute new hook templates or matcher types:

1. Add templates to `templates/hooks/`
2. Implement new matcher classes in `src/lib/hooks/matchers/`
3. Submit a pull request with tests and documentation