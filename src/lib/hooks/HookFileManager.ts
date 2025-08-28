import { HookConfig, HookDefinition } from "./types";
import { logger } from "../logger";
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';

export class HookFileManager {
  private projectRoot: string;
  private hooksDir: string;
  private definitionsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, hooksDir: string, definitionsDir: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.hooksDir = hooksDir;
    this.definitionsDir = definitionsDir;
    this.fs = fs || new NodeFileSystemAdapter();
  }

  /**
   * Remove hook files (definition and script)
   */
  async removeHookFiles(hook: HookConfig): Promise<void> {
    // Remove definition file
    const definitionPath = this.fs.join(this.definitionsDir, `${hook.id}.json`);
    try {
      await this.fs.unlink(definitionPath);
    } catch (error) {
      // File might not exist, ignore
    }

    // Remove script file if it's in our scripts directory
    if (hook.command) {
      const absoluteCommandPath = this.fs.isAbsolute(hook.command)
        ? hook.command
        : this.fs.join(this.projectRoot, hook.command);
      if (absoluteCommandPath.startsWith(this.hooksDir)) {
        try {
          await this.fs.unlink(absoluteCommandPath);
        } catch (error) {
          // File might not exist, ignore
        }
      }
    }
  }

  /**
   * Write script file for a hook
   */
  async writeScriptFile(templateName: string, scriptContent: string): Promise<string> {
    const scriptsDir = this.fs.join(this.hooksDir, "scripts");
    await this.fs.mkdir(scriptsDir, { recursive: true });
    const scriptPath = this.fs.join(scriptsDir, `${templateName}.sh`);
    await this.fs.writeFile(scriptPath, scriptContent);
    await this.fs.chmod(scriptPath, 0o755);
    
    // Calculate relative path manually since we need it to be portable
    let relativePath = scriptPath;
    if (scriptPath.startsWith(this.projectRoot)) {
      relativePath = scriptPath.slice(this.projectRoot.length);
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
    }
    return "./" + relativePath.replace(/\\/g, "/");
  }

  /**
   * Save hook definition to file
   */
  async saveHookDefinition(hookConfig: HookConfig): Promise<void> {
    // Ensure definitions directory exists before saving
    await this.fs.mkdir(this.definitionsDir, { recursive: true });

    // Save to definitions
    const definitionPath = this.fs.join(
      this.definitionsDir,
      `${hookConfig.id}.json`
    );
    const definition: HookDefinition = {
      version: "1.0.0",
      hooks: [hookConfig],
    };

    await this.fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
  }

  /**
   * Clean up old timestamped hooks (migration helper)
   */
  async cleanupTimestampedHooks(
    allHooks: { event: any; hooks: any[] }[],
    registry: { removeHook: (id: string) => void; addHook: (config: HookConfig) => void }
  ): Promise<void> {
    const timestampPattern = /-\d{13}$/; // Matches -[13 digits] at end
    const hooksToCleanup: Array<{ oldHook: any; baseName: string }> = [];

    // First, collect all hooks that need cleanup
    for (const { hooks } of allHooks) {
      for (const hook of hooks) {
        if (timestampPattern.test(hook.config.id)) {
          const baseName = hook.config.id.replace(timestampPattern, "");
          hooksToCleanup.push({ oldHook: hook, baseName });
        }
      }
    }

    // Now process them
    for (const { oldHook, baseName } of hooksToCleanup) {
      logger.info(`Cleaning up hook ID: ${oldHook.config.id} -> ${baseName}`);

      // Create new hook config with clean ID
      const cleanConfig = { ...oldHook.config, id: baseName };

      // Update script path if it exists
      if (
        cleanConfig.command &&
        cleanConfig.command.includes(oldHook.config.id)
      ) {
        const oldScriptPath = cleanConfig.command;
        const newScriptPath = oldScriptPath.replace(
          oldHook.config.id,
          baseName
        );

        // Rename script file (resolve to absolute paths)
        const absOld = this.fs.isAbsolute(oldScriptPath)
          ? oldScriptPath
          : this.fs.join(this.projectRoot, oldScriptPath);
        const absNew = this.fs.isAbsolute(newScriptPath)
          ? newScriptPath
          : this.fs.join(this.projectRoot, newScriptPath);

        try {
          // For filesystem adapters that don't have rename, we'll copy and delete
          const content = await this.fs.readFile(absOld);
          await this.fs.writeFile(absNew, content);
          await this.fs.unlink(absOld);
          
          // Calculate relative path manually
          let relativePath = absNew;
          if (absNew.startsWith(this.projectRoot)) {
            relativePath = absNew.slice(this.projectRoot.length);
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.slice(1);
            }
          }
          cleanConfig.command = "./" + relativePath.replace(/\\/g, "/");
        } catch (error) {
          logger.warn(`Could not rename script file: ${error}`);
        }
      }

      // Remove old hook from registry
      registry.removeHook(oldHook.config.id);

      // Add clean hook
      registry.addHook(cleanConfig);

      // Save new definition
      await this.saveHookDefinition(cleanConfig);

      // Remove old definition
      const oldDefinitionPath = this.fs.join(
        this.definitionsDir,
        `${oldHook.config.id}.json`
      );
      try {
        await this.fs.unlink(oldDefinitionPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }
}