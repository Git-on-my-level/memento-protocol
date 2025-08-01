---
allowed-tools: Bash(cat:.memento/modes/*)
argument-hint: <mode-name>
description: Switch to a specific Memento Protocol mode
---
# Switching to Mode: $ARGUMENTS

!`cat .memento/modes/$ARGUMENTS.md 2>/dev/null || echo "Mode '$ARGUMENTS' not found. Use /mode:list to see available modes."`

I'll now operate according to the $ARGUMENTS mode guidelines shown above.