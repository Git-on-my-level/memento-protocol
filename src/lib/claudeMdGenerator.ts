import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";

export class ClaudeMdGenerator {
  private claudeMdPath: string;

  constructor(projectRoot: string) {
    this.claudeMdPath = path.join(projectRoot, "CLAUDE.md");
  }

  /**
   * Generate minimal CLAUDE.md router
   */
  async generate(existingContent?: string): Promise<void> {
    // Load router content from external template; throw if missing
    const routerContent = await this.loadTemplate();
    if (!routerContent) {
      throw new Error(
        "Router template not found. Expected templates/claude_router_template.md to exist."
      );
    }
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
