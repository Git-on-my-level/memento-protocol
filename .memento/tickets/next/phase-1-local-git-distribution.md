# Phase 1: Local Git-based Distribution Strategy

## Overview
Implement a simple local development and distribution strategy using git and npm link for early adoption and development workflows.

## Scope
- Remove deprecated distribution code
- Simplify build process for local development
- Create clear local installation workflow
- Update documentation for git-based installation

## Technical Requirements

### 1. Clean up deprecated files
- Remove `install.sh` (GitHub release based)
- Remove `homebrew/memento-protocol.rb` (outdated)
- Remove `scripts/package.js` (complex standalone bundling)

### 2. Simplify build process
- Keep `scripts/build.js` but simplify it
- Remove platform-specific binary generation
- Focus on single `dist/cli.js` output
- Ensure templates are properly copied

### 3. Update package.json
- Verify `bin` field points to correct file
- Ensure `files` field includes necessary assets
- Update scripts for local development

### 4. Create local installation workflow
- Document git clone → npm install → npm link process
- Add development scripts if needed
- Test local installation process

## Acceptance Criteria
- [ ] Deprecated files removed
- [ ] Build process simplified and working
- [ ] `npm link` creates working global `memento` command
- [ ] Local development workflow documented
- [ ] All existing tests pass
- [ ] CLI functions correctly when installed locally

## Implementation Steps
1. Remove deprecated distribution files
2. Simplify build script
3. Test local installation workflow
4. Update documentation
5. Verify all commands work correctly

## Done When
- Developer can `git clone` → `npm install` → `npm link` → use `memento` globally
- All deprecated distribution code removed
- Build process is simple and maintainable
- Documentation updated for local installation