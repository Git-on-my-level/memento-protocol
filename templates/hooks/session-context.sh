#!/usr/bin/env bash
# Session context hook for Memento Protocol
# Provides comprehensive project context at session start

echo '## Project Context'
echo

# Git Status
echo '### Git Status'
git status -s 2>/dev/null || echo 'Not a git repository'
echo

# Recent Commits
echo '### Recent Commits'
git log --oneline -5 2>/dev/null || echo 'No recent commits'
echo

# Project Structure
echo '### Project Structure'
find . -type f \( -name '*.json' -o -name '*.js' -o -name '*.ts' -o -name '*.py' -o -name '*.java' -o -name '*.go' \) | 
    grep -E -v '(node_modules|\.git|dist|build|target)' | 
    head -20 || echo 'No project files found'

# Exit successfully
exit 0