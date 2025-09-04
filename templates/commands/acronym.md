---
name: acronym
description: Manage project acronyms and expansions
permission: READ_WRITE
---

# Acronym Management Command

Manage acronyms and their expansions for your project.

## Usage

- `/acronym add <acronym> "<expansion>"` - Add or update an acronym
- `/acronym list` - List all configured acronyms  
- `/acronym remove <acronym>` - Remove an acronym

## Examples

```
/acronym add API "Application Programming Interface"
/acronym add K8s "Kubernetes"
/acronym list
/acronym remove API
```

## Script Implementation

This command is implemented by the zcc CLI and requires the `.zcc` directory to be initialized in your project.

```bash
#!/bin/bash

# Get the command and arguments
CMD="$1"
shift
ARGS="$@"

# Change to project root (where .zcc directory should exist)
PROJECT_ROOT=$(pwd)
while [[ "$PROJECT_ROOT" != "/" && ! -d "$PROJECT_ROOT/.zcc" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.zcc" ]]; then
    echo "Error: Not in a zcc project (no .zcc directory found)"
    exit 1
fi

cd "$PROJECT_ROOT"

# Execute the zcc acronym command
case "$CMD" in
    "add")
        if [[ $# -lt 2 ]]; then
            echo "Usage: /acronym add <acronym> \"<expansion>\""
            exit 1
        fi
        ACRONYM="$1"
        shift
        EXPANSION="$*"
        zcc acronym add "$ACRONYM" "$EXPANSION"
        ;;
    "list"|"ls")
        zcc acronym list
        ;;
    "remove"|"rm")
        if [[ $# -lt 1 ]]; then
            echo "Usage: /acronym remove <acronym>"
            exit 1
        fi
        zcc acronym remove "$1"
        ;;
    *)
        echo "Acronym Management Commands:"
        echo "  add <acronym> \"<expansion>\"  Add/update an acronym"
        echo "  list                         List all acronyms"
        echo "  remove <acronym>             Remove an acronym"
        ;;
esac
```