# Improve acronym command ergonomics

## Description
The acronym command is crucial for reducing copy-paste fatigue but could be more ergonomic. Currently users must manually add each acronym one by one. We should make it easier to bulk manage acronyms and provide smart defaults.

## Improvement Ideas

### 1. Bulk Import
```bash
memento acronym import acronyms.txt
memento acronym import --format yaml acronyms.yml
```

### 2. Project Scanning
```bash
memento acronym scan           # Auto-detect common acronyms in codebase
memento acronym scan --suggest # Show potential acronyms to add
```

### 3. Acronym Sets/Presets
```bash
memento acronym use webdev     # Common web development acronyms
memento acronym use ml         # Machine learning acronyms
memento acronym use devops     # DevOps/K8s acronyms
```

### 4. Quick Add via Custom Command
```markdown
/acronym API "Application Programming Interface"
/acronym DDD "Domain-Driven Design"
```

### 5. Export/Share
```bash
memento acronym export > project-acronyms.txt
memento acronym export --format json
```

## Tasks
- [ ] Implement bulk import from text/yaml/json files
- [ ] Add acronym scanning to detect common patterns (all-caps words)
- [ ] Create preset acronym sets for common domains
- [ ] Add export functionality for sharing
- [ ] Create custom command for quick acronym addition
- [ ] Add fuzzy search for acronym lookup: `memento acronym search api`
- [ ] Support acronym aliases (multiple expansions)
- [ ] Add acronym usage statistics to show which are most used

## Benefits
- Reduces setup friction for new projects
- Enables team sharing of domain-specific acronyms
- Makes acronym management feel natural, not like a chore
- Aligns with "batteries included" philosophy

## Notes
- Consider storing presets in templates/acronyms/ directory
- Could integrate with git hooks to suggest new acronyms on commit
- Future: Community acronym sets in awesome-memento repo

---
Created: 2025-08-25T04:44:11.832Z
