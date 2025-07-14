# Summarize Workflow

A systematic approach to summarizing code, directories, or concepts to manage context efficiently.

## Workflow Steps

### 1. Scope Definition
Determine what needs to be summarized:
- Entire codebase
- Specific directory
- Set of related files
- Conceptual topic

### 2. Analysis Phase

#### For Code/Directory Summaries:
1. **Structure Analysis**
   - Map directory structure
   - Identify key modules/components
   - Note dependencies between parts

2. **Purpose Identification**
   - What does each component do?
   - How do components interact?
   - What are the main entry points?

3. **Pattern Recognition**
   - Common design patterns used
   - Coding conventions
   - Architectural decisions

#### For Conceptual Summaries:
1. **Core Concepts**
   - Key ideas and principles
   - Important terminology
   - Relationships between concepts

2. **Context Mapping**
   - Prerequisites
   - Related topics
   - Practical applications

### 3. Synthesis Phase

Create a hierarchical summary:
1. **High-Level Overview** (1-2 paragraphs)
   - Primary purpose
   - Key components
   - Main interactions

2. **Component Breakdown**
   - Brief description of each major part
   - Key responsibilities
   - Important details

3. **Essential Details**
   - Critical configuration
   - Important constraints
   - Notable decisions

### 4. Output Format

Structure the summary for maximum utility:

```markdown
# Summary: [Topic/Directory Name]

## Overview
[High-level description]

## Key Components
- **Component A**: [Brief description]
- **Component B**: [Brief description]

## Important Details
- [Critical detail 1]
- [Critical detail 2]

## Next Steps / Entry Points
- [Where to start exploring]
- [Key files to examine]
```

## Best Practices

1. **Be Concise**: Aim for 20% of original context size
2. **Preserve Essential Information**: Don't lose critical details
3. **Use Clear Structure**: Make summaries scannable
4. **Include Examples**: When they clarify complex concepts
5. **Update Regularly**: Summaries can become stale

## Integration Points

- Store summaries in `.memento/tickets/[task]/summaries/`
- Reference in mode switching for context transfer
- Use for onboarding new team members

## When to Use

- Before switching between modes
- When context window is filling up
- For progress documentation
- When resuming after a break