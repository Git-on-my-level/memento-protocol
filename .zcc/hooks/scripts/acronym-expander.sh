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
acronyms_file="${PROJECT_ROOT}/.zcc/acronyms.json"

# Check if acronyms config exists
if [ ! -f "$acronyms_file" ]; then
  # Create default acronyms for common modes
  cat > "$acronyms_file" << 'EOF'
{
  "settings": {
    "caseSensitive": false,
    "wholeWordOnly": true
  },
  "acronyms": {
    "apm": "autonomous-project-manager",
    "eng": "engineer",
    "arch": "architect",
    "rev": "reviewer",
    "debt": "ai-debt-maintainer"
  }
}
EOF
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
  # Skip empty lines
  [ -z "$acronym" ] && continue
  
  # Build the pattern based on settings
  if [ "$whole_word" = "true" ]; then
    pattern="\\b${acronym}\\b"
  else
    pattern="${acronym}"
  fi
  
  # Check if the acronym appears in the prompt
  if [ "$case_sensitive" = "true" ]; then
    if echo "$prompt" | grep -q "$pattern"; then
      detected_acronyms="${detected_acronyms}${detected_acronyms:+, }${acronym} → ${expansion}"
    fi
  else
    if echo "$prompt" | grep -qi "$pattern"; then
      detected_acronyms="${detected_acronyms}${detected_acronyms:+, }${acronym} → ${expansion}"
    fi
  fi
done <<< "$acronyms"

# Output detected acronyms
if [ -n "$detected_acronyms" ]; then
  echo "## Acronym Expansions"
  echo "$detected_acronyms"
  echo ""
fi

exit 0