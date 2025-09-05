---
name: publish-to-npm
description: Publishes a new version of the npm package using automated scripts to minimize token usage
author: zcc
version: 1.0.0
tags: []
dependencies: []
---

# NPM Package Release Workflow

This workflow publishes a new version of the npm package using automated scripts to minimize token usage.

## 1. Gather Release Context

Run the prepare script to collect all release information:
```bash
scripts/npm/prepare-release-context.sh > /tmp/release-context.json
```

This script will:
- Verify we're on the main branch
- Check for uncommitted changes (abort if any)
- Collect version info and commit history
- Output JSON with all context needed for decision making

## 2. Determine Version Bump

Based on the commits in the release context:
- **patch** (0.0.x): Bug fixes, documentation, minor changes
- **minor** (0.x.0): New features, enhancements, non-breaking changes  
- **major** (x.0.0): Breaking changes (look for BREAKING CHANGE in commits)

Update the version in `package.json` accordingly.

## 3. Generate and Review Changelog

Generate the changelog entry:
```bash
scripts/npm/generate-changelog-entry.js <new-version> /tmp/release-context.json > /tmp/changelog-entry.md
```

Review the generated entry and:
- Add it to the top of the `CHANGELOG.md` file (after the header)
- Enhance with additional context if needed
- Ensure all significant changes are captured
- Add the version link at the bottom of the file

## 4. Run Validation

Execute the prepublish validation:
```bash
npm run prepublishOnly
```

This runs tests and builds the package. If it fails, investigate and fix issues before proceeding.

## 5. Commit, Tag, and Publish

Run the automated release script:
```bash
scripts/npm/commit-tag-and-publish.sh v<new-version>
```

This script will:
- Create a release commit
- Tag the release
- Publish to npm
- Push commit and tags to GitHub

The release is now complete! 🎉