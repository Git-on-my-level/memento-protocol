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

# Extract mode/workflow request
MODE_REQUEST=$(echo "$PROMPT" | grep -o '[Mm]ode:[[:space:]]*[A-Za-z0-9_-]*' | sed 's/[Mm]ode:[[:space:]]*//' || true)
WORKFLOW_REQUEST=$(echo "$PROMPT" | grep -o '[Ww]orkflow:[[:space:]]*[A-Za-z0-9_-]*' | sed 's/[Ww]orkflow:[[:space:]]*//' || true)

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