#!/bin/sh
if [ -z "$1" ]; then
  sh .memento/scripts/list-modes.sh
else
  # First try exact match
  MODE_FILE=$(find .memento/modes -name "$1.md" | head -1)
  
  # If no exact match, try substring match
  if [ -z "$MODE_FILE" ]; then
    MODE_FILE=$(find .memento/modes -name "*$1*.md" | head -1)
  fi
  
  # If still no match, try acronym matching
  if [ -z "$MODE_FILE" ]; then
    # Convert input to lowercase for case-insensitive matching
    INPUT_LOWER=$(echo "$1" | tr '[:upper:]' '[:lower:]')
    
    # Look for files where the acronym matches
    for file in .memento/modes/*.md; do
      if [ -f "$file" ]; then
        basename_file=$(basename "$file" .md)
        # Extract first letter of each word separated by hyphens
        acronym=$(echo "$basename_file" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) printf tolower(substr($i,1,1))}')
        if [ "$acronym" = "$INPUT_LOWER" ]; then
          MODE_FILE="$file"
          break
        fi
      fi
    done
  fi
  
  if [ -n "$MODE_FILE" ]; then
    echo "# Switching to Mode: $(basename "$MODE_FILE" .md)"
    cat "$MODE_FILE"
  else
    echo "Mode '$1' not found. Available modes:"
    sh .memento/scripts/list-modes.sh
  fi
fi