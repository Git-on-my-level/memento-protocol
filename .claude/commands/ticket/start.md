---
allowed-tools: Bash(npx memento-protocol ticket move:*)
argument-hint: <ticket-name>
description: Move a ticket to in-progress status
---
# Starting Ticket: $ARGUMENTS

!`npx memento-protocol ticket move --to in-progress $ARGUMENTS`

The ticket is now in progress. I'll work with the context and requirements from this ticket.
Use `/ticket:context $ARGUMENTS` to load the full ticket context if needed.