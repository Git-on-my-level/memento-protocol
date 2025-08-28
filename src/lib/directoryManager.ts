import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { FileSystemError } from "./errors";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";

export class DirectoryManager {
  private projectRoot: string;
  private mementoDir: string;
  private claudeDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.mementoDir = this.fs.join(projectRoot, ".memento");
    this.claudeDir = this.fs.join(projectRoot, ".claude");
  }

  /**
   * Check if Memento Protocol is already initialized
   */
  isInitialized(): boolean {
    return this.fs.existsSync(this.mementoDir);
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
      this.fs.join(this.mementoDir, "modes"),
      this.fs.join(this.mementoDir, "workflows"),
      this.fs.join(this.mementoDir, "integrations"),
      this.fs.join(this.mementoDir, "scripts"),
      this.fs.join(this.mementoDir, "tickets"),
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
    const manifestPath = this.fs.join(this.mementoDir, "manifest.json");
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
      const fullPath = this.fs.join(this.mementoDir, dir);
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
    const manifestPath = this.fs.join(this.mementoDir, "manifest.json");
    if (!this.fs.existsSync(manifestPath)) {
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
    const gitignorePath = this.fs.join(this.projectRoot, ".gitignore");
    const mementoEntry = ".memento/";

    let gitignoreContent = "";

    // Read existing .gitignore if it exists
    if (this.fs.existsSync(gitignorePath)) {
      gitignoreContent = await this.fs.readFile(gitignorePath, "utf-8") as string;
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
    return this.fs.join(this.mementoDir, type, `${name}.md`);
  }

  /**
   * Get the manifest data
   */
  async getManifest(): Promise<any> {
    const manifestPath = this.fs.join(this.mementoDir, "manifest.json");

    if (!this.fs.existsSync(manifestPath)) {
      throw new Error(
        `Memento Protocol is not initialized in this project.\n\n` +
          `To fix this, run:\n` +
          `  npx memento-protocol init\n\n` +
          `This will create the necessary .memento directory structure and manifest file.`
      );
    }

    const content = await this.fs.readFile(manifestPath, "utf-8") as string;
    return JSON.parse(content);
  }

  /**
   * Update the manifest data
   */
  async updateManifest(manifest: any): Promise<void> {
    const manifestPath = this.fs.join(this.mementoDir, "manifest.json");
    await this.fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Copy essential scripts from templates to .memento/scripts/
   * These scripts are required for custom commands to work properly
   */
  private async copyEssentialScripts(): Promise<void> {
    const templatesDir = PackagePaths.getTemplatesDir();
    const templateScriptsDir = this.fs.join(templatesDir, "scripts");
    const mementoScriptsDir = this.fs.join(this.mementoDir, "scripts");

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
        const destPath = this.fs.join(mementoScriptsDir, scriptFile);

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
