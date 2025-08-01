#!/bin/sh
if [ -z "$1" ]; then
  sh .memento/scripts/list-modes.sh
else
  MODE_FILE=$(find .memento/modes -name "*$1*.md" | head -1)
  if [ -n "$MODE_FILE" ]; then
    echo "# Switching to Mode: $(basename "$MODE_FILE" .md)"
    cat "$MODE_FILE"
  else
    echo "Mode '$1' not found. Available modes:"
    sh .memento/scripts/list-modes.sh
  fi
fi