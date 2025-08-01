---
allowed-tools: Bash(grep:CLAUDE.md), Bash(sed:CLAUDE.md)
description: Show current active mode from CLAUDE.md
---
# Current Active Mode

!`grep -A 10 "## Current Mode" CLAUDE.md 2>/dev/null | head -15 || echo "No active mode found in CLAUDE.md"`

The mode shown above is currently active. Use `/mode:set <mode-name>` to switch to a different mode.