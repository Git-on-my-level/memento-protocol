import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "../logger";

export class PermissionGenerator {
  private claudeDir: string;

  constructor(claudeDir: string) {
    this.claudeDir = claudeDir;
  }

  /**
   * Generate permissions by reading command files
   */
  async generatePermissions(): Promise<{
    allow: string[];
    deny: string[];
  }> {
    const commandsDir = path.join(this.claudeDir, "commands");
    const allowPermissions = new Set<string>();

    // Base permissions that are always needed
    const basePermissions = [
      "Bash(mkdir:*)",
      "Bash(npm run build:*)",
      "Bash(npm run dev init:*)",
      "Bash(node:*)",
      "Bash(npx tsx:*)",
      "Bash(rm:*)",
      "Bash(timeout 15 npm run dev init -- --force --quick)",
      "Bash(gtimeout 15 npm run dev init -- --force --quick)",
      "Bash(npm run dev:*)",
      "Bash(npm test:*)",
      "Bash(mv:*)",
      "Bash(find:*)",
      "Bash(ls:*)",
      "Bash(npm init:*)",
      "Bash(git tag:*)",
      "Bash(git describe:*)",
      "Bash(npm run:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(npm publish:*)",
      "Bash(git push:*)",
      "Bash(chmod:*)",
      "Bash(scripts/npm/commit-tag-and-publish.sh:*)",
      "Bash(cat:*)",
      "Bash(../dist/cli.js)",
      "Bash(../src/cli.ts)",
      "WebFetch(domain:docs.anthropic.com)",
      "Bash(npx zcc ticket:*)",
    ];

    // Add base permissions
    basePermissions.forEach((perm) => allowPermissions.add(perm));

    try {
      // Check if commands directory exists first
      try {
        await fs.access(commandsDir);
      } catch {
        // Commands directory doesn't exist, skip reading command files
        logger.debug(
          `Commands directory ${commandsDir} does not exist, skipping command file permission generation`
        );
        return {
          allow: Array.from(allowPermissions).sort(),
          deny: [],
        };
      }

      // Read all command files and extract allowed-tools and command patterns
      const files = await fs.readdir(commandsDir);

      for (const file of files) {
        if (file.endsWith(".md")) {
          const filePath = path.join(commandsDir, file);
          const content = await fs.readFile(filePath, "utf-8");

          // Parse frontmatter to extract allowed-tools
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const toolsMatch = frontmatter.match(/allowed-tools:\s*(.+)/);
            if (toolsMatch) {
              const tools = toolsMatch[1].split(",").map((t) => t.trim());
              tools.forEach((tool) => {
                // Convert tool format to permission format
                // Handle formats like "Bash(sh:.zcc/scripts/mode-switch.sh)"
                if (tool.startsWith("Bash(") && tool.endsWith(")")) {
                  const innerContent = tool.slice(5, -1); // Remove "Bash(" and ")"
                  if (innerContent.includes(":")) {
                    // Already has pattern like "sh:.zcc/scripts/mode-switch.sh"
                    allowPermissions.add(`Bash(${innerContent}:*)`);
                  } else {
                    // Add :* for simple patterns
                    allowPermissions.add(`${tool}:*`);
                  }
                } else {
                  allowPermissions.add(tool);
                }
              });
            }
          }

          // Also extract command patterns from the content body
          // Look for patterns like !`sh .zcc/scripts/mode-switch.sh $ARGUMENTS`
          const commandPatternMatch = content.match(/!\`([^`]+)\`/g);
          if (commandPatternMatch) {
            commandPatternMatch.forEach((pattern) => {
              // Extract the command from the backticks
              const command = pattern.slice(2, -1); // Remove !` and `

              // Convert to proper Claude Code permission format
              // For commands like "sh .zcc/scripts/mode-switch.sh $ARGUMENTS"
              // Generate "Bash(sh .zcc/scripts/mode-switch.sh)" without colons
              const parts = command.trim().split(/\s+/);
              if (parts.length > 0) {
                const baseCommand = parts[0];
                if (parts.length > 1) {
                  // Has arguments, construct the command with space-separated format
                  const commandPath = parts[1];
                  // Remove $ARGUMENTS placeholder if present
                  const cleanCommand = `${baseCommand} ${commandPath}`.replace(
                    /\s+\$ARGUMENTS$/,
                    ""
                  );
                  allowPermissions.add(`Bash(${cleanCommand})`);
                } else {
                  // Simple command, use command:* format
                  allowPermissions.add(`Bash(${baseCommand}:*)`);
                }
              }
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not read command files for permissions: ${error}`);
    }

    return {
      allow: Array.from(allowPermissions).sort(),
      deny: [],
    };
  }
}