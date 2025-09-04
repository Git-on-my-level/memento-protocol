#!/bin/bash

# Read JSON input from stdin
json_input=$(cat)

# Extract the prompt field from JSON
prompt=$(echo "$json_input" | jq -r '.prompt // empty')

# If no prompt field, exit without output
if [ -z "$prompt" ]; then
  exit 0
fi

# Get the project root (current working directory)
PROJECT_ROOT="$(pwd)"

# Get the acronyms config path
acronyms_file="${PROJECT_ROOT}/.memento/acronyms.json"

# Check if acronyms config exists
if [ ! -f "$acronyms_file" ]; then
  # No acronyms file - don't output anything
  exit 0
fi

# Read acronyms config
acronyms_json=$(cat "$acronyms_file" 2>/dev/null || echo '{}')

# Extract settings
case_sensitive=$(echo "$acronyms_json" | jq -r '.settings.caseSensitive // false')
whole_word=$(echo "$acronyms_json" | jq -r '.settings.wholeWordOnly // true')

# Get all acronyms
acronyms=$(echo "$acronyms_json" | jq -r '.acronyms // {} | to_entries | .[] | "\(.key)|\(.value)"')

# Track detected acronyms
detected_acronyms=""

# Check each acronym
while IFS='|' read -r acronym expansion; do
  if [ -z "$acronym" ]; then
    continue
  fi
  
  # Build the search pattern
  if [ "$whole_word" = "true" ]; then
    pattern="\\b${acronym}\\b"
  else
    pattern="$acronym"
  fi
  
  # Check if acronym exists in prompt
  if [ "$case_sensitive" = "true" ]; then
    if echo "$prompt" | grep -q "$pattern"; then
      detected_acronyms="${detected_acronyms}- **${acronym}**: ${expansion}\n"
    fi
  else
    if echo "$prompt" | grep -qi "$pattern"; then
      # For case-insensitive, show the uppercase version
      display_acronym=$(echo "$acronym" | tr '[:lower:]' '[:upper:]')
      detected_acronyms="${detected_acronyms}- **${display_acronym}**: ${expansion}\n"
    fi
  fi
done <<< "$acronyms"

# If any acronyms were detected, output ONLY the glossary
# Claude Code will append the original prompt
if [ -n "$detected_acronyms" ]; then
  echo -e "## Acronym Glossary\n${detected_acronyms}\n---\n"
fi