import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import { ConfigManager } from "./configManager";

/**
 * @deprecated Use AgentFileGenerator instead for multi-agent support
 * This class is kept for backward compatibility
 */
export class ClaudeMdGenerator {
  private claudeMdPath: string;
  private configManager: ConfigManager;

  constructor(projectRoot: string) {
    this.claudeMdPath = path.join(projectRoot, "CLAUDE.md");
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Generate minimal CLAUDE.md router
   */
  async generate(existingContent?: string): Promise<void> {
    // Load router content from external template; throw if missing
    let routerContent = await this.loadTemplate();
    if (!routerContent) {
      throw new Error(
        "Router template not found. Expected templates/claude_router_template.md to exist."
      );
    }

    // Inject default mode configuration
    routerContent = await this.injectDefaultMode(routerContent);

    const finalContent = existingContent
      ? this.mergeWithExisting(routerContent, existingContent)
      : routerContent;

    await fs.writeFile(this.claudeMdPath, finalContent, "utf-8");
    logger.success("Generated CLAUDE.md router");
  }

  /**
   * Check if CLAUDE.md already exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.claudeMdPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read existing CLAUDE.md content
   */
  async readExisting(): Promise<string | null> {
    try {
      return await fs.readFile(this.claudeMdPath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Merge router content with existing CLAUDE.md
   */
  private mergeWithExisting(
    routerContent: string,
    existingContent: string
  ): string {
    // Check if existing content already has Memento Protocol section
    if (existingContent.includes("Memento Protocol Router")) {
      // Update the router section while preserving project-specific content
      const projectSpecificMarker =
        "<!-- Project-specific content below this line -->";
      const markerIndex = existingContent.indexOf(projectSpecificMarker);

      if (markerIndex !== -1) {
        // Preserve everything after the marker
        const projectContent = existingContent.substring(
          markerIndex + projectSpecificMarker.length
        );
        return routerContent + projectContent;
      }
    }

    // If no Memento section exists, append router to existing content
    return routerContent + "\n\n" + existingContent;
  }

  /**
   * Inject default mode configuration into the router content
   */
  private async injectDefaultMode(content: string): Promise<string> {
    try {
      const defaultMode = await this.configManager.get("defaultMode");
      if (!defaultMode) {
        return content;
      }

      // Add default mode instruction after the session start instructions
      const defaultModeInstruction = `0. **Default Mode**: IF NO MODE IS SPECIFIED OR IMPLIED: Load and activate "${defaultMode}" mode automatically at session start`;
      const sessionStartSection =
        "### What to do at the start of every fresh session";
      const sessionStartIndex = content.indexOf(sessionStartSection);

      if (sessionStartIndex !== -1) {
        // Find the end of the heading line
        const headingEndIndex = content.indexOf("\n", sessionStartIndex);
        if (headingEndIndex !== -1) {
          // Insert the default mode instruction right after the heading
          const before = content.substring(0, headingEndIndex + 1);
          const after = content.substring(headingEndIndex + 1);
          return before + defaultModeInstruction + "\n" + after;
        }
      }

      return content;
    } catch {
      // If config loading fails, return content unchanged
      return content;
    }
  }

  /**
   * Attempt to load router template from the project templates folder.
   * Returns the file contents on success, or null if the file is not found / unreadable.
   */
  private async loadTemplate(): Promise<string | null> {
    // Template lives at <projectRoot>/templates/claude_router_template.md
    const templatePath = path.join(
      path.dirname(this.claudeMdPath),
      "templates",
      "claude_router_template.md"
    );
    try {
      const content = await fs.readFile(templatePath, "utf-8");
      return typeof content === "string" ? content : null;
    } catch {
      // Swallow errors (e.g. file not found) and let caller fall back
      return null;
    }
  }
}
