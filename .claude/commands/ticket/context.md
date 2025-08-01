---
allowed-tools: Bash(cat:.memento/tickets/*/*)
argument-hint: <ticket-name>
description: Load ticket context into conversation
---
# Loading Context for Ticket: $ARGUMENTS

!`find .memento/tickets -name "*$ARGUMENTS*" -type f | head -1 | xargs cat 2>/dev/null || echo "Ticket '$ARGUMENTS' not found. Use /ticket:list to see available tickets."`

I now have the full context for this ticket and will work according to its requirements and specifications.