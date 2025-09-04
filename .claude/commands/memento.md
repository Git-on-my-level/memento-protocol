---
allowed-tools: Bash(npx zcc ticket list), Bash(ls:.zcc/modes/), Bash(ls:.zcc/workflows/), Bash(head:CLAUDE.md)
description: Show current zcc project status
---
# zcc Status

## Active Tickets
!`npx zcc ticket list 2>/dev/null || echo "No tickets found"`

## Available Modes
!`ls -1 .zcc/modes/ 2>/dev/null | head -10 || echo "No modes installed"`

## Available Workflows  
!`ls -1 .zcc/workflows/ 2>/dev/null | head -10 || echo "No workflows installed"`

## Current Configuration
!`head -20 CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"`