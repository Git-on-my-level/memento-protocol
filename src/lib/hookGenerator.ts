import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";

export class HookGenerator {
  private claudeDir: string;
  private mementoDir: string;
  private hooksDir: string;

  constructor(projectRoot: string) {
    this.claudeDir = path.join(projectRoot, ".claude");
    this.mementoDir = path.join(projectRoot, ".memento");
    this.hooksDir = path.join(this.mementoDir, "hooks");
  }

  /**
   * Generate hook infrastructure for the project
   */
  async generate(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Generate routing script
    await this.generateRoutingScript();

    // Generate or update settings.toml
    await this.generateSettingsToml();

    logger.success("Generated Claude Code hook infrastructure");
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.claudeDir, { recursive: true });
    await fs.mkdir(this.hooksDir, { recursive: true });
  }

  /**
   * Generate the routing.sh script with fuzzy matching
   */
  private async generateRoutingScript(): Promise<void> {
    const scriptPath = path.join(this.hooksDir, "routing.sh");
    
    const scriptContent = `#!/bin/bash

# Get user prompt from stdin
PROMPT=$(cat)

# Extract mode/workflow/ticket request
MODE_REQUEST=$(echo "$PROMPT" | grep -o '[Mm]ode:[[:space:]]*[A-Za-z0-9_-]*' | sed 's/[Mm]ode:[[:space:]]*//' || true)
WORKFLOW_REQUEST=$(echo "$PROMPT" | grep -o '[Ww]orkflow:[[:space:]]*[A-Za-z0-9_-]*' | sed 's/[Ww]orkflow:[[:space:]]*//' || true)
TICKET_REQUEST=$(echo "$PROMPT" | grep -o '[Tt]icket:[[:space:]]*[A-Za-z0-9_/-]*' | sed 's/[Tt]icket:[[:space:]]*//' || true)

# Extract .memento paths from prompt
MEMENTO_MODE_PATH=$(echo "$PROMPT" | grep -o '\\.memento/modes/[A-Za-z0-9_-]*\\.md' | sed 's|\\.memento/modes/||; s|\\.md||' | head -1 || true)
MEMENTO_WORKFLOW_PATH=$(echo "$PROMPT" | grep -o '\\.memento/workflows/[A-Za-z0-9_-]*\\.md' | sed 's|\\.memento/workflows/||; s|\\.md||' | head -1 || true)
MEMENTO_TICKET_PATH=$(echo "$PROMPT" | grep -o '\\.memento/tickets/[A-Za-z0-9_/-]*' | sed 's|\\.memento/tickets/||' | head -1 || true)

# Use path-based detection if no explicit request
if [ -z "$MODE_REQUEST" ] && [ -n "$MEMENTO_MODE_PATH" ]; then
    MODE_REQUEST="$MEMENTO_MODE_PATH"
fi
if [ -z "$WORKFLOW_REQUEST" ] && [ -n "$MEMENTO_WORKFLOW_PATH" ]; then
    WORKFLOW_REQUEST="$MEMENTO_WORKFLOW_PATH"
fi
if [ -z "$TICKET_REQUEST" ] && [ -n "$MEMENTO_TICKET_PATH" ]; then
    TICKET_REQUEST="$MEMENTO_TICKET_PATH"
fi

# Read default mode from config if no mode specified
DEFAULT_MODE=""
if [ -z "$MODE_REQUEST" ] && [ -f ".memento/config.json" ]; then
    DEFAULT_MODE=$(grep '"defaultMode"' .memento/config.json | sed 's/.*"defaultMode"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/' || true)
fi

# Function to find fuzzy matches
find_matches() {
    local query="$1"
    local type="$2"  # "mode" or "workflow"
    local matches=()
    
    # Get all available items
    if [ "$type" = "mode" ]; then
        if [ -d ".memento/modes" ]; then
            items=($(ls .memento/modes/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md//' || true))
        else
            items=()
        fi
    else
        if [ -d ".memento/workflows" ]; then
            items=($(ls .memento/workflows/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md//' || true))
        else
            items=()
        fi
    fi
    
    # Return early if no items
    if [ \${#items[@]} -eq 0 ]; then
        echo ""
        return
    fi
    
    # Convert query to lowercase
    query_lower=$(echo "$query" | tr '[:upper:]' '[:lower:]')
    
    # Stage 1: Exact match (case-insensitive)
    for item in "\${items[@]}"; do
        item_lower=$(echo "$item" | tr '[:upper:]' '[:lower:]')
        if [ "$item_lower" = "$query_lower" ]; then
            matches+=("$item")
            echo "\${matches[@]}"
            return
        fi
    done
    
    # Stage 2: Prefix match
    for item in "\${items[@]}"; do
        item_lower=$(echo "$item" | tr '[:upper:]' '[:lower:]')
        case "$item_lower" in
            "$query_lower"*)
                matches+=("$item")
                ;;
        esac
    done
    
    # Stage 3: Substring match
    if [ \${#matches[@]} -eq 0 ]; then
        for item in "\${items[@]}"; do
            item_lower=$(echo "$item" | tr '[:upper:]' '[:lower:]')
            case "$item_lower" in
                *"$query_lower"*)
                    matches+=("$item")
                    ;;
            esac
        done
    fi
    
    # Stage 4: Common abbreviations (generated from item names)
    if [ \${#matches[@]} -eq 0 ]; then
        for item in "\${items[@]}"; do
            item_lower=$(echo "$item" | tr '[:upper:]' '[:lower:]')
            
            # Extract abbreviation from hyphenated names (e.g., autonomous-project-manager -> apm)
            if echo "$item_lower" | grep -q '-'; then
                abbrev=$(echo "$item_lower" | sed 's/\\([a-z]\\)[a-z]*-*/\\1/g')
                if [ "$abbrev" = "$query_lower" ]; then
                    matches+=("$item")
                fi
            fi
            
            # First 3-4 letters abbreviation (e.g., architect -> arch, review -> rev)
            if [ \${#query_lower} -ge 3 ] && [ \${#query_lower} -le 4 ]; then
                if echo "$item_lower" | grep -q "^$query_lower"; then
                    matches+=("$item")
                fi
            fi
        done
    fi
    
    echo "\${matches[@]}"
}

# Process mode request or use default
if [ -n "$MODE_REQUEST" ]; then
    # Explicit mode requested
    MATCHES=($(find_matches "$MODE_REQUEST" "mode"))
    
    if [ \${#MATCHES[@]} -eq 0 ]; then
        echo "## No Mode Match Found"
        echo "Could not find a mode matching: $MODE_REQUEST"
        echo "Available modes in .memento/modes/:"
        if [ -d ".memento/modes" ]; then
            ls .memento/modes/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md//' | sed 's/^/  - /' || echo "  (none)"
        else
            echo "  (none - .memento/modes directory not found)"
        fi
    elif [ \${#MATCHES[@]} -eq 1 ]; then
        echo "## Mode: \${MATCHES[0]}"
        cat ".memento/modes/\${MATCHES[0]}.md"
    else
        echo "## Multiple Mode Matches Found for: $MODE_REQUEST"
        for match in "\${MATCHES[@]}"; do
            echo ""
            echo "### Mode: $match"
            cat ".memento/modes/$match.md"
            echo ""
            echo "---"
        done
        echo ""
        echo "Claude will select the most appropriate mode based on context."
    fi
    echo ""
elif [ -n "$DEFAULT_MODE" ]; then
    # No explicit mode requested, but default mode is configured
    if [ -f ".memento/modes/$DEFAULT_MODE.md" ]; then
        echo "## Mode: $DEFAULT_MODE (default)"
        cat ".memento/modes/$DEFAULT_MODE.md"
        echo ""
    fi
fi
# If no mode requested and no default mode, just pass through the prompt unaltered

# Process workflow request
if [ -n "$WORKFLOW_REQUEST" ]; then
    MATCHES=($(find_matches "$WORKFLOW_REQUEST" "workflow"))
    
    if [ \${#MATCHES[@]} -eq 0 ]; then
        echo "## No Workflow Match Found"
        echo "Could not find a workflow matching: $WORKFLOW_REQUEST"
        echo "Available workflows in .memento/workflows/:"
        if [ -d ".memento/workflows" ]; then
            ls .memento/workflows/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md//' | sed 's/^/  - /' || echo "  (none)"
        else
            echo "  (none - .memento/workflows directory not found)"
        fi
    elif [ \${#MATCHES[@]} -eq 1 ]; then
        echo "## Workflow: \${MATCHES[0]}"
        cat ".memento/workflows/\${MATCHES[0]}.md"
    else
        echo "## Multiple Workflow Matches Found for: $WORKFLOW_REQUEST"
        for match in "\${MATCHES[@]}"; do
            echo ""
            echo "### Workflow: $match"
            cat ".memento/workflows/$match.md"
            echo ""
            echo "---"
        done
        echo ""
        echo "Claude will select the most appropriate workflow based on context."
    fi
    echo ""
fi

# Process ticket request
if [ -n "$TICKET_REQUEST" ]; then
    # Function to find ticket in any status directory
    find_ticket() {
        local ticket="$1"
        local statuses=("next" "in-progress" "done")
        
        for status in "\${statuses[@]}"; do
            # Check if ticket is already a path with status
            if echo "$ticket" | grep -q "^$status/"; then
                if [ -f ".memento/tickets/$ticket.md" ] || [ -f ".memento/tickets/$ticket" ]; then
                    echo "$ticket"
                    return
                fi
            else
                # Search in each status directory
                if [ -f ".memento/tickets/$status/$ticket.md" ]; then
                    echo "$status/$ticket"
                    return
                elif [ -f ".memento/tickets/$status/$ticket" ]; then
                    echo "$status/$ticket"
                    return
                fi
            fi
        done
        
        echo ""
    }
    
    TICKET_PATH=$(find_ticket "$TICKET_REQUEST")
    
    if [ -z "$TICKET_PATH" ]; then
        echo "## No Ticket Match Found"
        echo "Could not find a ticket matching: $TICKET_REQUEST"
        echo "Available tickets:"
        for status in next in-progress done; do
            if [ -d ".memento/tickets/$status" ]; then
                echo "  $status:"
                ls ".memento/tickets/$status" 2>/dev/null | sed 's/^/    - /' || true
            fi
        done
    else
        echo "## Ticket: $TICKET_PATH"
        echo ""
        echo "### Ticket Commands"
        echo "\\\`\\\`\\\`bash"
        echo "# Create a new ticket"
        echo "npx memento-protocol ticket create \\"ticket-name\\""
        echo ""
        echo "# Move ticket to different status"
        echo "npx memento-protocol ticket move $TICKET_REQUEST --to in-progress  # or: next, done"
        echo ""
        echo "# Delete a ticket"
        echo "npx memento-protocol ticket delete $TICKET_REQUEST"
        echo ""
        echo "# List all tickets"
        echo "npx memento-protocol ticket list"
        echo "\\\`\\\`\\\`"
        echo ""
        echo "### Working with Tickets"
        echo ""
        echo "- Tickets are simple markdown files that serve as persistent workspaces"
        echo "- Use your file editing tools to update ticket content directly"
        echo "- Tickets survive between sessions - use them to track progress and share context"
        echo "- When working on large tasks, create multiple tickets and delegate to sub-agents"
        echo ""
        
        # Output ticket content
        if [ -f ".memento/tickets/$TICKET_PATH.md" ]; then
            echo "### Ticket Content"
            cat ".memento/tickets/$TICKET_PATH.md"
        elif [ -f ".memento/tickets/$TICKET_PATH" ]; then
            echo "### Ticket Content"
            cat ".memento/tickets/$TICKET_PATH"
        else
            echo "### Error"
            echo "Ticket file not found at expected location."
        fi
    fi
    echo ""
fi

# Output the original prompt
echo "$PROMPT"
`;

    await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });
    logger.info("Generated routing script at .memento/hooks/routing.sh");
  }

  /**
   * Generate or update .claude/settings.toml
   */
  private async generateSettingsToml(): Promise<void> {
    const settingsPath = path.join(this.claudeDir, "settings.toml");
    
    // Check if settings.toml already exists
    let existingContent = "";
    try {
      existingContent = await fs.readFile(settingsPath, "utf-8");
    } catch {
      // File doesn't exist, that's fine
    }

    // Check if our hook is already configured
    if (existingContent.includes(".memento/hooks/routing.sh")) {
      logger.info("Hook already configured in .claude/settings.toml");
      return;
    }

    // Add our hook configuration
    const hookConfig = `
[[hooks]]
event = "UserPromptSubmit"
command = "./.memento/hooks/routing.sh"
`;

    // If file exists and has content, append our hook
    if (existingContent.trim()) {
      existingContent += "\n" + hookConfig;
    } else {
      existingContent = hookConfig.trim() + "\n";
    }

    await fs.writeFile(settingsPath, existingContent);
    logger.info("Updated .claude/settings.toml with hook configuration");
  }
}