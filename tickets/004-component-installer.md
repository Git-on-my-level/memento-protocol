# Ticket: Component Installation System

## Objective
Implement component installation from templates to project

## Tasks
- [ ] Create ComponentInstaller class
- [ ] Implement interactive component selection
- [ ] Copy templates to project .memento directory
- [ ] Handle component dependencies
- [ ] Track installed components in manifest

## Commands
- `memento add mode <name>`: Install specific mode
- `memento add workflow <name>`: Install specific workflow
- `memento list`: Show available components
- `memento list --installed`: Show installed components

## Acceptance Criteria
- Interactive prompts for component selection
- Dependency resolution (workflows requiring specific modes)
- Manifest file tracks installations