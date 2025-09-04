# Kill metadata.json - Make templates self-describing

## Description
Currently, component metadata is duplicated in templates/metadata.json and must be kept in sync with actual template files. This creates maintenance burden and confusion. Instead, templates should be self-describing using frontmatter (like Jekyll/Hugo), making it easier to add custom components.

## Implementation Design
```markdown
---
name: architect
description: System design and architecture focus  
version: 1.0.0
author: zcc
tags: [planning, architecture, design]
---
# Architect Mode
Your actual mode content...
```

## Tasks
- [ ] Add frontmatter parsing library (gray-matter or similar)
- [ ] Update componentInstaller.ts to read metadata from template files
- [ ] Migrate existing metadata.json content into template frontmatter
- [ ] Remove metadata.json file
- [ ] Update all template files with frontmatter
- [ ] Update component discovery logic to scan directories directly
- [ ] Add validation for required frontmatter fields
- [ ] Update tests for new template format
- [ ] Update documentation for creating custom components

## Benefits
- Single source of truth for component metadata
- Easier to create custom components (just drop in a file)
- No sync issues between metadata and templates
- More like zsh plugin structure (self-contained files)

## Notes
- This aligns with the "zsh for Claude Code" philosophy
- Makes community contributions easier
- Reduces complexity significantly
- Consider using YAML frontmatter for consistency with other tools

---
Created: 2025-08-25T04:43:31.723Z
