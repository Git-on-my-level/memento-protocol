# Ticket: Unify Mode Section Names

## Status
next

## Description
Mode templates (`templates/modes/*`) use different section headings (e.g., "Working Methods", "Behavioral Guidelines", "Core Responsibilities"). Inconsistent section names make automated parsing harder and can confuse human readers.

## Tasks
- [ ] Decide on a canonical set of section headings (e.g., Behavioral Guidelines, Core Responsibilities, Best Practices, Mode Switching Triggers, Done When, Example Commands).
- [ ] Update each mode markdown file to use the agreed headings in the same order.
- [ ] Adjust any internal links or references affected by heading changes.
- [ ] Update docs/COMPONENT_GUIDE.md with the section standard.
- [ ] Add CI test to fail if unexpected headings appear in a mode template.

## Acceptance Criteria
- All mode markdown files share identical heading names and ordering.
- CI linter verifies heading conformity.
- Documentation reflects the standard. 