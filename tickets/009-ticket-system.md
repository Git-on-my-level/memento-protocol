# Ticket: Ticket Management System

## Objective
Implement ticket-based state management for persistent workspace

## Tasks
- [ ] Create TicketManager class
- [ ] Generate ticket IDs (semantic + timestamp)
- [ ] Create ticket directory structure
- [ ] Implement ticket lifecycle (create, update, close, resume)
- [ ] Add ticket listing and search

## Commands
- `memento ticket create <name>`: Start new ticket
- `memento ticket list`: Show active tickets
- `memento ticket resume <id>`: Continue work
- `memento ticket close <id>`: Archive ticket

## Ticket Structure
```
.memento/tickets/[id]/
├── metadata.json
├── progress.md
├── decisions.md
└── workspace/
```

## Acceptance Criteria
- Tickets persist across sessions
- Easy to resume work
- Clear ticket organization