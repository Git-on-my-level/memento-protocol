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
- `/acronym clear` - Clear all acronyms
- `/acronym use <preset>` - Load a preset collection (webdev, devops)
- `/acronym import <file>` - Import acronyms from a file
- `/acronym export [--format json]` - Export acronyms

## Examples

```
/acronym add API "Application Programming Interface"
/acronym add K8s "Kubernetes"
/acronym list
/acronym use webdev
/acronym export --format json
```

## Script Implementation

This command is implemented by the Memento Protocol CLI and requires the `.memento` directory to be initialized in your project.

```bash
#!/bin/bash

# Get the command and arguments
CMD="$1"
shift
ARGS="$@"

# Change to project root (where .memento directory should exist)
PROJECT_ROOT=$(pwd)
while [[ "$PROJECT_ROOT" != "/" && ! -d "$PROJECT_ROOT/.memento" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.memento" ]]; then
    echo "Error: Not in a Memento Protocol project (no .memento directory found)"
    exit 1
fi

cd "$PROJECT_ROOT"

# Execute the memento acronym command
case "$CMD" in
    "add")
        if [[ $# -lt 2 ]]; then
            echo "Usage: /acronym add <acronym> \"<expansion>\""
            exit 1
        fi
        ACRONYM="$1"
        shift
        EXPANSION="$*"
        memento acronym add "$ACRONYM" "$EXPANSION"
        ;;
    "list"|"ls")
        memento acronym list
        ;;
    "remove"|"rm")
        if [[ $# -lt 1 ]]; then
            echo "Usage: /acronym remove <acronym>"
            exit 1
        fi
        memento acronym remove "$1"
        ;;
    "clear")
        memento acronym clear
        ;;
    "use")
        if [[ $# -lt 1 ]]; then
            echo "Usage: /acronym use <preset>"
            memento acronym presets
            exit 1
        fi
        memento acronym use "$1"
        ;;
    "import")
        if [[ $# -lt 1 ]]; then
            echo "Usage: /acronym import <file> [--format text|json] [--merge]"
            exit 1
        fi
        memento acronym import "$@"
        ;;
    "export")
        memento acronym export "$@"
        ;;
    "presets")
        memento acronym presets
        ;;
    *)
        echo "Acronym Management Commands:"
        echo "  add <acronym> \"<expansion>\"  Add/update an acronym"
        echo "  list                         List all acronyms"
        echo "  remove <acronym>             Remove an acronym"
        echo "  clear                        Clear all acronyms"
        echo "  use <preset>                 Load preset collection"
        echo "  import <file>                Import from file"
        echo "  export                       Export acronyms"
        echo "  presets                      List available presets"
        ;;
esac
```