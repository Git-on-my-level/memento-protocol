# Ticket: Component Update System

## Objective
Allow updating components from template repository

## Tasks
- [ ] Version tracking for components
- [ ] Check for updates command
- [ ] Selective update with diff preview
- [ ] Backup before update
- [ ] Merge custom modifications
- [ ] Support update via CLI commands AND via interactive

## Commands
- `memento update --check`: List available updates
- `memento update [component]`: Update specific component
- `memento update --all`: Update all components

## Acceptance Criteria
- Safe updates with backups
- Preserves local modifications
- Clear update notifications