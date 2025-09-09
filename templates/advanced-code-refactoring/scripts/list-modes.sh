#!/bin/sh
for mode in .zcc/modes/*.md; do
  if [ -f "$mode" ]; then
    echo "## $(basename "$mode" .md)"
    head -3 "$mode" | tail -1
    echo
  fi
done 2>/dev/null || echo "No modes installed."
