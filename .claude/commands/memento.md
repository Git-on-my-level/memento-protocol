---
allowed-tools: Bash(npx memento-protocol ticket list), Bash(ls:.memento/modes/), Bash(ls:.memento/workflows/), Bash(head:CLAUDE.md)
description: Show current Memento Protocol project status
---
# Memento Protocol Status

## Active Tickets
!`npx memento-protocol ticket list 2>/dev/null || echo "No tickets found"`

## Available Modes
!`ls -1 .memento/modes/ 2>/dev/null | head -10 || echo "No modes installed"`

## Available Workflows  
!`ls -1 .memento/workflows/ 2>/dev/null | head -10 || echo "No workflows installed"`

## Current Configuration
!`head -20 CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"`