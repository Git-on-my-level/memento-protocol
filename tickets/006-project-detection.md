# Ticket: Project Type Detection

## Objective
Detect project type and suggest relevant components

## Tasks
- [ ] Create ProjectDetector class
- [ ] Detect language from package.json, go.mod, Cargo.toml, etc.
- [ ] Let's start simple with just golang and typescript/javascript
- [ ] Detect frameworks (React, Express, Django, etc.)
- [ ] Let's start simple and just support React and gin, vanilla golang
- [ ] Suggest relevant modes and workflows
- [ ] Support custom detection rules

## Detection Sources
- Package managers: npm, yarn, go, etc...
- Config files: tsconfig.json, webpack.config.js
- Directory patterns: src/, tests/, docs/
- File extensions distribution
- We can also read an existing CLAUDE.md as a starting point and append to it only
- In the future we can add support for AI as detection, for example delegating to Claude Code

## Acceptance Criteria
- Accurately basic common project types
- Suggests appropriate components
- Extensible for custom rules