import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { FileSystemError } from "./errors";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";

export class DirectoryManager {
  private projectRoot: string;
  private zccDir: string;
  private claudeDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.zccDir = this.fs.join(projectRoot, ".zcc");
    this.claudeDir = this.fs.join(projectRoot, ".claude");
  }

  /**
   * Check if zcc is already initialized
   */
  isInitialized(): boolean {
    return this.fs.existsSync(this.zccDir);
  }

  /**
   * Initialize the .zcc directory structure
   *
   * CRITICAL SAFETY NOTE: This method MUST NEVER delete existing user data!
   * - Only create directories that don't exist
   * - Never use fs.rm, fs.rmdir, or fs.unlink on .zcc contents
   * - Never overwrite existing custom modes, workflows, or tickets
   * - The { recursive: true } option in fs.mkdir is safe - it won't overwrite existing dirs
   *
   * User's custom components are sacred - they represent hours of work and customization.
   * Deleting them would be catastrophic and violate user trust.
   */
  async initializeStructure(): Promise<void> {
    const directories = [
      this.zccDir,
      this.fs.join(this.zccDir, "modes"),
      this.fs.join(this.zccDir, "workflows"),
      this.fs.join(this.zccDir, "integrations"),
      this.fs.join(this.zccDir, "scripts"),
      this.fs.join(this.zccDir, "tickets"),
      this.claudeDir,
      this.fs.join(this.claudeDir, "agents"),
    ];

    for (const dir of directories) {
      try {
        logger.debug(`Creating directory: ${dir}`);
        // Safe: mkdir with recursive:true creates only if not exists
        await this.fs.mkdir(dir, { recursive: true });
      } catch (error) {
        throw new FileSystemError(
          `Failed to create directory: ${dir}`,
          dir,
          "Ensure you have write permissions in the project directory"
        );
      }
    }

    // Create a manifest file to track installed components
    const manifestPath = this.fs.join(this.zccDir, "manifest.json");
    if (!this.fs.existsSync(manifestPath)) {
      const manifest = {
        version: "1.0.0",
        created: new Date().toISOString(),
        components: {
          modes: [],
          workflows: [],
          integrations: [],
          agents: [],
        },
      };
      await this.fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }

    // Copy essential scripts for custom commands
    await this.copyEssentialScripts();
  }

  /**
   * Validate the directory structure and report any issues
   */
  async validateStructure(): Promise<{ valid: boolean; missing: string[] }> {
    const requiredDirs = [
      "modes",
      "workflows",
      "integrations",
      "scripts",
      "tickets",
    ];
    const requiredClaudeDirs = ["agents"];

    const missing: string[] = [];

    for (const dir of requiredDirs) {
      const fullPath = this.fs.join(this.zccDir, dir);
      if (!this.fs.existsSync(fullPath)) {
        missing.push(dir);
      }
    }

    for (const dir of requiredClaudeDirs) {
      const fullPath = this.fs.join(this.claudeDir, dir);
      if (!this.fs.existsSync(fullPath)) {
        missing.push(`.claude/${dir}`);
      }
    }

    // Check for manifest file
    const manifestPath = this.fs.join(this.zccDir, "manifest.json");
    if (!this.fs.existsSync(manifestPath)) {
      missing.push("manifest.json");
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Ensure .gitignore includes .zcc directory
   */
  async ensureGitignore(): Promise<void> {
    const gitignorePath = this.fs.join(this.projectRoot, ".gitignore");
    const zccEntry = ".zcc/";

    let gitignoreContent = "";

    // Read existing .gitignore if it exists
    if (this.fs.existsSync(gitignorePath)) {
      gitignoreContent = await this.fs.readFile(gitignorePath, "utf-8") as string;
    }

    // Check if .zcc is already in .gitignore
    const lines = gitignoreContent.split("\n");
    const hasZccEntry = lines.some(
      (line) =>
        line.trim() === ".zcc" ||
        line.trim() === ".zcc/" ||
        line.trim() === "/.zcc" ||
        line.trim() === "/.zcc/"
    );

    if (!hasZccEntry) {
      // Add .zcc entry
      if (gitignoreContent && !gitignoreContent.endsWith("\n")) {
        gitignoreContent += "\n";
      }

      // Add a comment if this is the first entry
      if (!gitignoreContent.trim()) {
        gitignoreContent += "# ZCC (Memento Protocol)\n";
      } else {
        gitignoreContent += "\n# ZCC (Memento Protocol)\n";
      }

      gitignoreContent += zccEntry + "\n";

      await this.fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  /**
   * Get the path to a specific component
   */
  getComponentPath(
    type: "modes" | "workflows" | "integrations" | "agents",
    name: string
  ): string {
    if (type === "agents") {
      return this.fs.join(this.claudeDir, "agents", `${name}.md`);
    }
    return this.fs.join(this.zccDir, type, `${name}.md`);
  }

  /**
   * Get the manifest data
   */
  async getManifest(): Promise<any> {
    const manifestPath = this.fs.join(this.zccDir, "manifest.json");

    if (!this.fs.existsSync(manifestPath)) {
      throw new Error(
        `zcc is not initialized in this project.\n\n` +
          `To fix this, run:\n` +
          `  npx zcc init\n\n` +
          `This will create the necessary .zcc directory structure and manifest file.`
      );
    }

    const content = await this.fs.readFile(manifestPath, "utf-8") as string;
    return JSON.parse(content);
  }

  /**
   * Update the manifest data
   */
  async updateManifest(manifest: any): Promise<void> {
    const manifestPath = this.fs.join(this.zccDir, "manifest.json");
    await this.fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Copy essential scripts from templates to .zcc/scripts/
   * These scripts are required for custom commands to work properly
   */
  private async copyEssentialScripts(): Promise<void> {
    const templatesDir = PackagePaths.getTemplatesDir();
    const templateScriptsDir = this.fs.join(templatesDir, "scripts");
    const zccScriptsDir = this.fs.join(this.zccDir, "scripts");

    // Check if template scripts directory exists
    if (!this.fs.existsSync(templateScriptsDir)) {
      logger.debug(
        "No template scripts directory found, skipping script copying"
      );
      return;
    }

    try {
      // Get list of script files from templates
      const scriptFiles = await this.fs.readdir(templateScriptsDir);

      for (const scriptFile of scriptFiles) {
        const sourcePath = this.fs.join(templateScriptsDir, scriptFile);
        const destPath = this.fs.join(zccScriptsDir, scriptFile);

        // Only copy if the destination doesn't exist (don't overwrite user modifications)
        if (!this.fs.existsSync(destPath)) {
          logger.debug(`Copying script: ${scriptFile}`);
          await this.fs.copyFile(sourcePath, destPath);

          // Make the script executable (on Unix-like systems)
          if (process.platform !== "win32") {
            await this.fs.chmod(destPath, 0o755);
          }
        }
      }

      logger.debug("Essential scripts copied successfully");
    } catch (error) {
      logger.warn(`Failed to copy essential scripts: ${error}`);
    }
  }
}
