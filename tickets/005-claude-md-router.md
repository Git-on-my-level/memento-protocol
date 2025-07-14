# Ticket: CLAUDE.md Router Implementation

## Objective
Generate minimal CLAUDE.md that acts as router to .memento components

## Tasks
- [ ] Create ClaudeMdGenerator class
- [ ] Generate router instructions (< 200 lines)
- [ ] Preserve existing project-specific content
- [ ] Add mode activation syntax
- [ ] Add workflow invocation syntax

## Router Content
- How to activate modes: "act as [mode]"
- How to run workflows: "execute [workflow]"
- How to resume tickets: "continue ticket [id]"
- Pointer to .memento directory

## Acceptance Criteria
- Generated CLAUDE.md is under 200 lines
- Existing content is preserved in marked section
- Clear instructions for Claude to follow