# Component Creation Guide

This guide helps LLMs and developers create custom components for Memento Protocol.

## Component Types

### 1. Modes (Personality/Behavior)

Location: `.memento/modes/<name>.md`

Structure:
```markdown
# Mode: [Name]

[One paragraph description of the mode's purpose and personality]

## Expertise
- [List key areas of expertise]
- [Skills and knowledge domains]

## Approach
1. [Step-by-step methodology]
2. [How this mode handles tasks]

## Communication Style
- [How this mode communicates]
- [Tone and formality level]

## Best For
- [Types of tasks this mode excels at]
- [When to use this mode]
```

### 2. Workflows (Procedures)

Location: `.memento/workflows/<name>.md`

Structure:
```markdown
# Workflow: [Name]

[Brief description of what this workflow accomplishes]

## Prerequisites
- [Any required setup or context]
- [Dependencies or requirements]

## Steps
1. **[Step Name]**: [Detailed description]
   - [Sub-steps if needed]
   - [Expected outcomes]

2. **[Step Name]**: [Detailed description]
   - [Sub-steps if needed]
   - [Expected outcomes]

## Outputs
- [What this workflow produces]
- [Artifacts or deliverables]

## Next Steps
- [Typical follow-up actions]
- [Related workflows]
```

### 3. Language Overrides

Location: `.memento/languages/<language>/overrides.md`

Structure:
```markdown
# Language: [Language Name]

## Conventions
- [Language-specific coding standards]
- [Naming conventions]
- [File organization]

## Best Practices
- [Language-specific patterns]
- [Performance considerations]
- [Security guidelines]

## Common Patterns
### [Pattern Name]
```[language]
// Example code
```

## Testing Approach
- [Preferred testing framework]
- [Test organization]
- [Coverage expectations]

## Build & Deploy
- [Build tools and processes]
- [Deployment considerations]
```

## Metadata Files

Each component directory should have a `metadata.json`:

```json
{
  "components": {
    "component-name": {
      "description": "Brief description",
      "version": "1.0.0",
      "tags": ["tag1", "tag2"],
      "author": "optional-author"
    }
  }
}
```

## Best Practices

1. **Be Specific**: Components should have a clear, focused purpose
2. **Be Concise**: Avoid unnecessary verbosity
3. **Be Practical**: Include real-world examples
4. **Be Consistent**: Follow the established format
5. **Be Helpful**: Anticipate common questions

## Testing Your Components

After creating a component:

1. Install it: `memento add [type] [name]`
2. Regenerate CLAUDE.md: `memento init --update`
3. Test with Claude Code to ensure it works as expected

## Sharing Components

To share your components:

1. Create a GitHub repository
2. Structure it like the official template repo
3. Users can then configure it as their template source

## Examples

See the `templates/` directory for reference implementations of all component types.