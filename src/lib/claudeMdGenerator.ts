import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import { ConfigManager } from "./configManager";

export class ClaudeMdGenerator {
  private claudeMdPath: string;
  private configManager: ConfigManager;
  private projectRoot: string;
  private mementoPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.claudeMdPath = path.join(projectRoot, "CLAUDE.md");
    this.mementoPath = path.join(projectRoot, ".memento");
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

    // Replace template tags
    routerContent = await this.replaceTags(routerContent);

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
   * Replace template tags in the router content
   */
  private async replaceTags(content: string): Promise<string> {
    // Replace <default_mode> tag
    content = await this.replaceDefaultMode(content);
    
    // Replace <list_modes> tag
    content = await this.replaceListModes(content);
    
    return content;
  }

  /**
   * Replace <default_mode> tag with default mode instruction
   */
  private async replaceDefaultMode(content: string): Promise<string> {
    try {
      const defaultMode = await this.configManager.get("defaultMode");
      if (defaultMode) {
        const defaultModeInstruction = `0. **Default Mode**: IF NO MODE IS SPECIFIED OR IMPLIED: Load and activate "${defaultMode}" mode automatically at session start`;
        content = content.replace("<default_mode>", defaultModeInstruction);
      } else {
        // Remove the tag if no default mode is set
        content = content.replace("<default_mode>\n", "");
      }
      return content;
    } catch {
      // If config loading fails, remove the tag
      return content.replace("<default_mode>\n", "");
    }
  }

  /**
   * Replace <list_modes> tag with list of all available modes
   */
  private async replaceListModes(content: string): Promise<string> {
    try {
      const modes = await this.discoverModes();
      
      if (modes.length > 0) {
        const modeList = modes.map(mode => `- \`${mode}\``).join("\n");
        content = content.replace("<list_modes>", modeList);
      } else {
        // Remove the tag if no modes found
        content = content.replace("<list_modes>\n", "");
      }
      
      return content;
    } catch {
      // If mode discovery fails, remove the tag
      return content.replace("<list_modes>\n", "");
    }
  }

  /**
   * Discover all available modes (official and custom)
   * 
   * CRITICAL SAFETY NOTE: This method ONLY READS directories!
   * - Never delete or modify any files during discovery
   * - Custom modes in .memento/modes are preserved
   * - If a custom mode has the same name as an official mode, the custom one takes precedence
   * - This ensures user customizations are never lost
   * 
   * The discovery process is read-only and safe. It's used to generate
   * the mode list in CLAUDE.md without touching user files.
   */
  private async discoverModes(): Promise<string[]> {
    const modes: string[] = [];
    
    // First, add official modes from templates
    try {
      const templatesModesPath = path.join(this.projectRoot, "templates", "modes");
      const templateFiles = await fs.readdir(templatesModesPath);
      const templateModes = templateFiles
        .filter(file => file.endsWith(".md"))
        .map(file => file.replace(".md", ""));
      modes.push(...templateModes);
    } catch {
      // Templates directory might not exist
    }
    
    // Then, add custom modes from .memento/modes
    // SAFE: Only reading directory, not modifying anything
    try {
      const customModesPath = path.join(this.mementoPath, "modes");
      const customFiles = await fs.readdir(customModesPath);
      const customModes = customFiles
        .filter(file => file.endsWith(".md"))
        .map(file => file.replace(".md", ""))
        .filter(mode => !modes.includes(mode)); // Avoid duplicates
      modes.push(...customModes);
    } catch {
      // .memento/modes directory might not exist
    }
    
    return modes;
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
