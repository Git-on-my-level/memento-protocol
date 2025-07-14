# Ticket: Template Repository Structure

## Objective
Define and implement template repository layout for modes/workflows

## Tasks
- [ ] Create templates directory in project
- [ ] Implement default mode templates (project-manager, architect, engineer, reviewer)
- [ ] Implement default workflow templates (summarize, review)
- [ ] Create metadata format for component discovery
- [ ] Add example language override structure

## Template Format
```
templates/
├── modes/
│   ├── project-manager.md
│   └── metadata.json
├── workflows/
│   ├── summarize.md
│   └── metadata.json
└── languages/
    └── typescript/
        └── refactor.md
```

## Acceptance Criteria
- A clear directory structure for the template repo is defined.
- The CLI can fetch a list of available components from the repo.
- A specification for the template repository is created and a sample repository is published (e.g., on GitHub).

## Key Considerations
- Authentication for private repositories.

## Dependencies
- `001-cli-scaffolding.md`

## Status
- Pending