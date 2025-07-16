# Summarize Workflow

A systematic approach to compressing context and extracting essential information from codebases, directories, or complex topics.

## Output Format

The workflow produces a structured summary saved to `.memento/tickets/[current]/summaries/[timestamp].md`:

```markdown
# Summary: [Topic/Scope]
Scope: [what was analyzed]

## Executive Summary
[1-2 paragraph overview for quick understanding]

## Architecture Overview
[System structure and key design decisions]

## Key Components
### Component Name
- Purpose: [what it does]
- Location: [where to find it]
- Dependencies: [what it needs]
- Interface: [how to use it]

## Data Flow
[How information moves through the system]

## Entry Points
[Where to start when working with this code]

## Critical Paths
[Most important flows through the system]

## Technical Debt / Notes
[Important limitations or future work]
```

## Best Practices

1. **Be Ruthlessly Concise**: Aim for 10-20% of original context
2. **Preserve Critical Information**: Architecture > Implementation details
3. **Include Code Snippets**: Include concise code snippets or pseudocode where helpful
4. **Make it Scannable**: Use consistent formatting and headers
5. **Version Summaries**: Include timestamps and scope
