# Ticket: Add "Done When" Section to Each Mode

## Status
next

## Description
Agents require an explicit signal that a mode’s responsibilities are complete. Adding a `## Done When` bullet list to every mode template will clarify exit criteria for autonomous workflows.

## Tasks
- [ ] Draft a concise set of "done" bullets tailored for each mode (Architect, Engineer, Project Manager, Reviewer).
- [ ] Insert a `## Done When` section (after Mode Switching Triggers) in each mode file.
- [ ] Ensure wording uses consistent, testable language (e.g., "Design approved", "All tests pass").
- [ ] Update documentation and examples where relevant.
- [ ] Add CI rule to check that every mode file contains a `## Done When` heading.

## Acceptance Criteria
- Each mode markdown file contains a `## Done When` section with at least one bullet.
- CI passes with new linter rule. 