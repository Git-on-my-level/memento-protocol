import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import { FileSystemError } from "./errors";
import { logger } from "./logger";

export class DirectoryManager {
  private projectRoot: string;
  private mementoDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.mementoDir = path.join(projectRoot, ".memento");
  }

  /**
   * Check if Memento Protocol is already initialized
   */
  isInitialized(): boolean {
    return existsSync(this.mementoDir);
  }

  /**
   * Initialize the .memento directory structure
   *
   * CRITICAL SAFETY NOTE: This method MUST NEVER delete existing user data!
   * - Only create directories that don't exist
   * - Never use fs.rm, fs.rmdir, or fs.unlink on .memento contents
   * - Never overwrite existing custom modes, workflows, or tickets
   * - The { recursive: true } option in fs.mkdir is safe - it won't overwrite existing dirs
   *
   * User's custom components are sacred - they represent hours of work and customization.
   * Deleting them would be catastrophic and violate user trust.
   */
  async initializeStructure(): Promise<void> {
    const directories = [
      this.mementoDir,
      path.join(this.mementoDir, "modes"),
      path.join(this.mementoDir, "workflows"),
      path.join(this.mementoDir, "integrations"),
      path.join(this.mementoDir, "tickets"),
    ];

    for (const dir of directories) {
      try {
        logger.debug(`Creating directory: ${dir}`);
        // Safe: mkdir with recursive:true creates only if not exists
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        throw new FileSystemError(
          `Failed to create directory: ${dir}`,
          dir,
          "Ensure you have write permissions in the project directory"
        );
      }
    }

    // Create a manifest file to track installed components
    const manifestPath = path.join(this.mementoDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      const manifest = {
        version: "1.0.0",
        created: new Date().toISOString(),
        components: {
          modes: [],
          workflows: [],
          integrations: [],
        },
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }
  }

  /**
   * Validate the directory structure and report any issues
   */
  async validateStructure(): Promise<{ valid: boolean; missing: string[] }> {
    const requiredDirs = ["modes", "workflows", "integrations", "tickets"];

    const missing: string[] = [];

    for (const dir of requiredDirs) {
      const fullPath = path.join(this.mementoDir, dir);
      if (!existsSync(fullPath)) {
        missing.push(dir);
      }
    }

    // Check for manifest file
    const manifestPath = path.join(this.mementoDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      missing.push("manifest.json");
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Ensure .gitignore includes .memento directory
   */
  async ensureGitignore(): Promise<void> {
    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    const mementoEntry = ".memento/";

    let gitignoreContent = "";

    // Read existing .gitignore if it exists
    if (existsSync(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    }

    // Check if .memento is already in .gitignore
    const lines = gitignoreContent.split("\n");
    const hasMementoEntry = lines.some(
      (line) =>
        line.trim() === ".memento" ||
        line.trim() === ".memento/" ||
        line.trim() === "/.memento" ||
        line.trim() === "/.memento/"
    );

    if (!hasMementoEntry) {
      // Add .memento entry
      if (gitignoreContent && !gitignoreContent.endsWith("\n")) {
        gitignoreContent += "\n";
      }

      // Add a comment if this is the first entry
      if (!gitignoreContent.trim()) {
        gitignoreContent += "# Memento Protocol\n";
      } else {
        gitignoreContent += "\n# Memento Protocol\n";
      }

      gitignoreContent += mementoEntry + "\n";

      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  /**
   * Get the path to a specific component
   */
  getComponentPath(
    type: "modes" | "workflows" | "integrations",
    name: string
  ): string {
    return path.join(this.mementoDir, type, `${name}.md`);
  }

  /**
   * Get the manifest data
   */
  async getManifest(): Promise<any> {
    const manifestPath = path.join(this.mementoDir, "manifest.json");

    if (!existsSync(manifestPath)) {
      throw new Error(
        `Memento Protocol is not initialized in this project.\n\n` +
          `To fix this, run:\n` +
          `  npx memento-protocol init\n\n` +
          `This will create the necessary .memento directory structure and manifest file.`
      );
    }

    const content = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Update the manifest data
   */
  async updateManifest(manifest: any): Promise<void> {
    const manifestPath = path.join(this.mementoDir, "manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
