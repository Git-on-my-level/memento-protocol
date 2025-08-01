---
allowed-tools: Bash(npx memento-protocol ticket move:*)
argument-hint: <ticket-name>
description: Mark a ticket as completed
---
# Completing Ticket: $ARGUMENTS

!`npx memento-protocol ticket move --to done $ARGUMENTS`

The ticket has been marked as completed! Great work.
Use `/ticket:list` to see your updated ticket status.