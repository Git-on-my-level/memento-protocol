import * as fs from "fs/promises";
import * as path from "path";
import { HookConfig, HookDefinition } from "./types";
import { logger } from "../logger";
import { ensureDirectory } from "../utils/filesystem";

export class HookFileManager {
  private projectRoot: string;
  private hooksDir: string;
  private definitionsDir: string;

  constructor(projectRoot: string, hooksDir: string, definitionsDir: string) {
    this.projectRoot = projectRoot;
    this.hooksDir = hooksDir;
    this.definitionsDir = definitionsDir;
  }

  /**
   * Remove hook files (definition and script)
   */
  async removeHookFiles(hook: HookConfig): Promise<void> {
    // Remove definition file
    const definitionPath = path.join(this.definitionsDir, `${hook.id}.json`);
    try {
      await fs.unlink(definitionPath);
    } catch (error) {
      // File might not exist, ignore
    }

    // Remove script file if it's in our scripts directory
    if (hook.command) {
      const absoluteCommandPath = path.isAbsolute(hook.command)
        ? hook.command
        : path.join(this.projectRoot, hook.command);
      if (absoluteCommandPath.startsWith(this.hooksDir)) {
        try {
          await fs.unlink(absoluteCommandPath);
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
    const scriptsDir = path.join(this.hooksDir, "scripts");
    await ensureDirectory(scriptsDir);
    const scriptPath = path.join(scriptsDir, `${templateName}.sh`);
    await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });
    
    // Return relative command path for portability
    return "./" + path.relative(this.projectRoot, scriptPath).replace(/\\/g, "/");
  }

  /**
   * Save hook definition to file
   */
  async saveHookDefinition(hookConfig: HookConfig): Promise<void> {
    // Ensure definitions directory exists before saving
    await ensureDirectory(this.definitionsDir);

    // Save to definitions
    const definitionPath = path.join(
      this.definitionsDir,
      `${hookConfig.id}.json`
    );
    const definition: HookDefinition = {
      version: "1.0.0",
      hooks: [hookConfig],
    };

    await fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
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
        const absOld = path.isAbsolute(oldScriptPath)
          ? oldScriptPath
          : path.join(this.projectRoot, oldScriptPath);
        const absNew = path.isAbsolute(newScriptPath)
          ? newScriptPath
          : path.join(this.projectRoot, newScriptPath);

        try {
          await fs.rename(absOld, absNew);
          // Store as relative for portability
          cleanConfig.command =
            "./" + path.relative(this.projectRoot, absNew).replace(/\\/g, "/");
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
      const oldDefinitionPath = path.join(
        this.definitionsDir,
        `${oldHook.config.id}.json`
      );
      try {
        await fs.unlink(oldDefinitionPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }
}