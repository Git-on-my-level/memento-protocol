---
allowed-tools: Bash(sh:.memento/scripts/ticket-context.sh)
argument-hint: [ticket-name]
description: Manage tickets stored as .md files in .memento/tickets/ directories
---
# Ticket Management

!`sh .memento/scripts/ticket-context.sh $ARGUMENTS`

## Important: How Tickets Work

**Tickets are markdown files stored in the filesystem:**
- Location: `.memento/tickets/{status}/ticket-name.md`
- Status directories: `next/`, `in-progress/`, `done/`
- Example paths: 
  - `.memento/tickets/next/fix-login-bug.md`
  - `.memento/tickets/in-progress/add-user-profile.md`

**To read ticket content, use the Read tool with the full file path:**
- Use `Read` tool with path like `.memento/tickets/next/ticket-name.md`
- **There is NO CLI command to read ticket content - always use Read tool**
- Tickets are plain markdown files you can edit directly with Edit tool

**CLI commands are only for ticket lifecycle management:**
- Create: `npx memento-protocol ticket create "name"`
- Move: `npx memento-protocol ticket move name --to status`
- List: `npx memento-protocol ticket list`

I now have ticket information loaded. Use Read tool to access actual ticket content.