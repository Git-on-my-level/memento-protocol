#!/bin/sh
if [ -z "$1" ]; then
  sh .zcc/scripts/list-modes.sh
else
  MODE_FILE=$(find .zcc/modes -name "*$1*.md" | head -1)
  if [ -n "$MODE_FILE" ]; then
    echo "# Switching to Mode: $(basename "$MODE_FILE" .md)"
    cat "$MODE_FILE"
  else
    echo "Mode '$1' not found. Available modes:"
    sh .zcc/scripts/list-modes.sh
  fi
fi