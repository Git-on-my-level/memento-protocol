#!/bin/bash

# Security Guard Hook - Blocks dangerous Bash commands
# This hook runs before the Bash tool executes

# Read the tool call from stdin
tool_call=$(cat)

# Extract the command from the tool call JSON
command=$(echo "$tool_call" | jq -r '.tool_input.command // empty')

# Check if command contains super-user commands
if echo "$command" | grep -qE '\b(sudo|su|doas)\b'; then
  echo "BLOCKED: Super-user commands are not allowed for safety." >&2
  exit 2
fi

# Check for other dangerous patterns
if echo "$command" | grep -qE '(rm -rf|:(){:|dd if=|mkfs\.|/dev/(sd|hd|nvme))'; then
  echo "BLOCKED: Potentially dangerous command detected." >&2
  exit 2
fi

# If safe, pass through the tool call unchanged
echo "$tool_call"