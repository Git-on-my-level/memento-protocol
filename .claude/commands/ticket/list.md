---
allowed-tools: Bash(npx memento-protocol ticket list), Bash(ls:.memento/tickets/*)
description: List all Memento Protocol tickets by status
---
# Ticket Status Overview

!`npx memento-protocol ticket list`

Available ticket commands:
- `/ticket:start <name>` - Move ticket to in-progress
- `/ticket:done <name>` - Complete a ticket
- `/ticket:context <name>` - Load ticket context
- `/ticket:create <name>` - Create a new ticket