# Ticket: Add Explicit CLI/Natural-Language Examples to Templates

## Status
next

## Description
Responsibilities in templates are currently described conceptually, but agents benefit from concrete examples of the commands or phrases that should trigger an action. Adding examples (e.g., `act as engineer`, `build feature X`) will improve agent reliability.

## Tasks
- [ ] Identify key actions within each template (modes & workflows).
- [ ] Add an `## Example Commands` subsection listing at least 3 typical invocations.
- [ ] Update router template to reference these examples where relevant.
- [ ] Ensure examples are synced with docs & help output of the CLI.

## Acceptance Criteria
- Every mode and workflow file includes an `## Example Commands` section.
- Examples are validated in documentation tests (or markdown spellcheck).
- Router template links/examples remain consistent. 