---
allowed-tools: Bash(ls:.memento/modes/), Bash(cat:.memento/modes/*)
description: Switch between modes interactively
---
# Mode Management

## Available Modes
!`ls -1 .memento/modes/ 2>/dev/null || echo "No modes installed. Run 'memento add mode' to install modes."`

Use mode commands:
- `/mode:list` - List all available modes
- `/mode:set <mode-name>` - Switch to a specific mode
- `/mode:current` - Show current active mode

Which mode would you like to activate?