#!/usr/bin/env bash
# Git context loader hook for Memento Protocol
# Provides succinct git status on each user prompt

echo '## Git Status'
# Show only the first 10 changed files to keep output succinct
git status -s 2>/dev/null | head -10 || echo 'Not a git repository'

# Exit successfully
exit 0