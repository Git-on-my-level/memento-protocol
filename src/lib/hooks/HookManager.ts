import { HookRegistry } from "./HookRegistry";
import { HookConfig, HookDefinition, HookEvent } from "./types";
import { logger } from "../logger";
import { HookConfigLoader } from "./HookConfigLoader";
import { ZccRoutingHook } from "./builtin/ZccRoutingHook";
import { PackagePaths } from "../packagePaths";
import { HookValidator } from "./HookValidator";
import { ValidationError } from "../errors";
import { PermissionGenerator } from "./PermissionGenerator";
import { HookFileManager } from "./HookFileManager";
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';

export class HookManager {
  private registry: HookRegistry;
  private configLoader: HookConfigLoader;
  private validator: HookValidator;
  private permissionGenerator: PermissionGenerator;
  private fileManager: HookFileManager;
  private projectRoot: string;
  private claudeDir: string;
  private zccDir: string;
  private hooksDir: string;
  private definitionsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.claudeDir = this.fs.join(projectRoot, ".claude");
    this.zccDir = this.fs.join(projectRoot, ".zcc");
    this.hooksDir = this.fs.join(this.zccDir, "hooks");
    this.definitionsDir = this.fs.join(this.hooksDir, "definitions");

    this.registry = new HookRegistry();
    this.configLoader = new HookConfigLoader(this.definitionsDir, this.fs);
    this.validator = new HookValidator(projectRoot);
    this.permissionGenerator = new PermissionGenerator(this.claudeDir);
    this.fileManager = new HookFileManager(projectRoot, this.hooksDir, this.definitionsDir, this.fs);
  }

  /**
   * Initialize the hook system
   */
  async initialize(force?: boolean): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Generate built-in hooks first
    await this.generateBuiltinHooks();

    // Load hook definitions
    await this.loadHookDefinitions();

    // Clean up old timestamped hooks
    await this.cleanupTimestampedHooks();

    // Generate Claude settings
    await this.generateClaudeSettings(force);

    logger.success("Hook system initialized");
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await this.fs.mkdir(this.claudeDir, { recursive: true });
    await this.fs.mkdir(this.hooksDir, { recursive: true });
    await this.fs.mkdir(this.definitionsDir, { recursive: true });
    await this.fs.mkdir(this.fs.join(this.hooksDir, "scripts"), { recursive: true });
    await this.fs.mkdir(this.fs.join(this.hooksDir, "templates"), { recursive: true });
  }

  /**
   * Load all hook definitions
   */
  private async loadHookDefinitions(): Promise<void> {
    try {
      const definitions = await this.configLoader.loadAll();

      for (const definition of definitions) {
        for (const hookConfig of definition.hooks) {
          this.registry.addHook(hookConfig);
        }
      }

      logger.info(`Loaded ${definitions.length} hook definitions`);
    } catch (error: any) {
      logger.warn(`No hook definitions found: ${error.message}`);
    }
  }

  /**
   * Generate built-in hooks (like the routing hook)
   */
  private async generateBuiltinHooks(): Promise<void> {
    // Generate the ZCC routing hook
    const routingHook = new ZccRoutingHook(this.projectRoot);
    await routingHook.generate();

    // Add it to the registry
    const routingConfig: HookConfig = {
      id: "zcc-routing",
      name: "ZCC Routing Hook",
      description: "Routes modes, workflows, and tickets based on user prompts",
      event: "UserPromptSubmit",
      enabled: true,
      // Store command as relative to project root for portability
      command: (() => {
        const scriptPath = this.fs.join(this.hooksDir, "scripts", "zcc-routing.sh");
        let relativePath = scriptPath;
        if (scriptPath.startsWith(this.projectRoot)) {
          relativePath = scriptPath.slice(this.projectRoot.length);
          if (relativePath.startsWith('/')) {
            relativePath = relativePath.slice(1);
          }
        }
        return "./" + relativePath.replace(/\\/g, "/");
      })(),
      priority: 100, // High priority to run first
      requirements: {
        commands: ["jq", "grep", "sed", "cat", "echo", "ls", "basename"],
      },
    };

    this.registry.addHook(routingConfig);

    // Save routing hook definition
    const definitionPath = this.fs.join(
      this.definitionsDir,
      "zcc-routing.json"
    );
    const definition: HookDefinition = {
      version: "1.0.0",
      hooks: [routingConfig],
    };

    await this.fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
  }

  /**
   * Generate or update .claude/settings.local.json
   */
  private async generateClaudeSettings(force?: boolean): Promise<void> {
    // Ensure .claude directory exists
    await this.fs.mkdir(this.claudeDir, { recursive: true });

    const settingsPath = this.fs.join(this.claudeDir, "settings.local.json");

    // Get all hooks from registry
    const allHooks = this.registry.getAllHooks();

    // Flatten and sort all hooks by priority (higher priority first)
    interface FlatHook {
      event: HookEvent;
      hook: any;
      priority: number;
    }

    const flatHooks: FlatHook[] = [];
    for (const { event, hooks } of allHooks) {
      for (const hook of hooks) {
        if (!hook.enabled) continue;
        flatHooks.push({
          event,
          hook,
          priority: hook.config.priority || 50, // Default priority
        });
      }
    }

    // Sort by priority (descending) and then by name for stability
    flatHooks.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.hook.config.name.localeCompare(b.hook.config.name);
    });

    // Use a Set to track unique hook combinations (event + command) to prevent duplicates
    const uniqueHooks = new Set<string>();

    // Initialize hooks object
    const hooksConfig: any = {};

    for (const { event, hook } of flatHooks) {
      // Create a unique key for this hook (event + command + args)
      const argsString = hook.config.args
        ? JSON.stringify(hook.config.args)
        : "";
      const dedupeKey = `${event}:${hook.config.command}:${argsString}`;

      // Skip if we've already seen this exact hook combination
      if (uniqueHooks.has(dedupeKey)) {
        logger.debug(
          `Skipping duplicate hook: ${hook.config.name} (${dedupeKey})`
        );
        continue;
      }

      uniqueHooks.add(dedupeKey);

      // Convert absolute paths to relative paths for portability
      let hookCommand = hook.config.command;
      if (hookCommand.startsWith(this.projectRoot)) {
        hookCommand = "." + hookCommand.substring(this.projectRoot.length);
      }

      // Initialize the event array if it doesn't exist
      if (!hooksConfig[event]) {
        hooksConfig[event] = [];
      }

      // Determine the matcher pattern
      let matcher = "*";
      if (event === "PreToolUse" || event === "PostToolUse") {
        // For tool hooks, use the specific tool name
        if (
          hook.config.matcher &&
          hook.config.matcher.type === "tool" &&
          hook.config.matcher.pattern
        ) {
          matcher = hook.config.matcher.pattern;
        } else {
          logger.warn(
            `PreToolUse/PostToolUse hook ${hook.config.name} missing tool matcher`
          );
          continue;
        }
      }

      // Create the hook entry
      const hookEntry: any = {
        matcher,
        hooks: [
          {
            type: "command",
            command: hookCommand,
            timeout: 30,
            ...(hook.config.args &&
              hook.config.args.length > 0 && { args: hook.config.args }),
          },
        ],
      };

      hooksConfig[event].push(hookEntry);
    }

    // Read existing settings and merge (unless force is true)
    let existingSettings: any = {};
    let mergedHooks: any = {};
    
    if (!force) {
      try {
        const existingContent = await this.fs.readFile(settingsPath, "utf-8") as string;
        existingSettings = JSON.parse(existingContent);
        
        // Merge hooks into existing settings, preserving existing hooks within the same event
        const existingHooks = existingSettings.hooks || {};
        mergedHooks = { ...existingHooks };

        // For each event, merge hooks instead of replacing
        for (const [event, newHooksList] of Object.entries(hooksConfig)) {
          if (!mergedHooks[event]) {
            mergedHooks[event] = [];
          }

          // Add new hooks that don't already exist
          for (const newHook of newHooksList as any[]) {
            const existingHook = mergedHooks[event].find(
              (h: any) =>
                h.matcher === newHook.matcher &&
                h.hooks[0]?.command === newHook.hooks[0]?.command
            );

            if (!existingHook) {
              mergedHooks[event].push(newHook);
            }
          }
        }
      } catch {
        // File doesn't exist or is invalid JSON, start fresh
        mergedHooks = hooksConfig;
      }
    } else {
      // Force mode: completely replace hooks section
      try {
        const existingContent = await this.fs.readFile(settingsPath, "utf-8") as string;
        existingSettings = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid JSON, start fresh
      }
      mergedHooks = hooksConfig;
    }

    // Generate permissions from command files
    const permissions = await this.permissionGenerator.generatePermissions();

    const newSettings = {
      ...existingSettings,
      permissions,
      hooks: mergedHooks,
    };

    await this.fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    logger.debug("Updated .claude/settings.local.json");
  }


  /**
   * Add a new hook
   */
  async addHook(config: HookConfig): Promise<void> {
    this.registry.addHook(config);
    await this.generateClaudeSettings();
  }

  /**
   * Remove a hook
   */
  async removeHook(id: string): Promise<boolean> {
    // Find the hook first to get its file paths
    const hook = await this.findExistingHook(id);
    if (hook) {
      await this.fileManager.removeHookFiles(hook);
    }

    const removed = this.registry.removeHook(id);
    if (removed) {
      await this.generateClaudeSettings();
    }
    return removed;
  }

  /**
   * Create a hook from a template
   */
  async createHookFromTemplate(
    templateName: string,
    config: Partial<HookConfig>
  ): Promise<void> {
    const templatePath = this.fs.join(
      PackagePaths.getTemplatesDir(),
      "hooks",
      `${templateName}.json`
    );

    try {
      const templateContent = await this.fs.readFile(templatePath, "utf-8") as string;
      const template: any = JSON.parse(templateContent);

      // Use clean ID without timestamp
      const hookId = config.id || templateName;

      // Check if hook already exists and remove it first
      const existingHook = await this.findExistingHook(hookId);
      if (existingHook) {
        logger.debug(`Updating existing hook: ${hookId}`);
        await this.fileManager.removeHookFiles(existingHook);
        this.registry.removeHook(hookId);
      }

      // Handle script-based hooks
      let command = template.command;

      // Check if template expects a script file
      if (template.command === "${HOOK_SCRIPT}") {
        // Look for corresponding .sh file
        const scriptTemplatePath = this.fs.join(
          PackagePaths.getTemplatesDir(),
          "hooks",
          `${templateName}.sh`
        );
        try {
          const scriptContent = await this.fs.readFile(scriptTemplatePath, "utf-8") as string;
          template.script = scriptContent;
          command = null; // Will be set below
        } catch (error) {
          throw new Error(`Script template not found: ${templateName}.sh`);
        }
      }

      if (template.script && !command) {
        // Validate script before creating file
        const scriptValidation = this.validator.validateScript(template.script);
        if (!scriptValidation.valid) {
          throw new ValidationError(
            `Script validation failed: ${scriptValidation.errors.join(", ")}`,
            "script"
          );
        }

        if (scriptValidation.warnings.length > 0) {
          logger.warn(`Script warnings for ${templateName}:`);
          scriptValidation.warnings.forEach((warning) =>
            logger.warn(`  - ${warning}`)
          );
        }

        // Create script file with clean name
        command = await this.fileManager.writeScriptFile(templateName, template.script);
      }

      // Merge template with provided config
      const hookConfig: HookConfig = {
        ...template,
        ...config,
        id: hookId,
        name: config.name || template.name || templateName,
        command: (() => {
          if (!command) return command as unknown as string;
          // Ensure stored command is relative to project root
          if (this.fs.isAbsolute(command)) {
            let relativePath = command;
            if (command.startsWith(this.projectRoot)) {
              relativePath = command.slice(this.projectRoot.length);
              if (relativePath.startsWith('/')) {
                relativePath = relativePath.slice(1);
              }
            }
            return "./" + relativePath.replace(/\\/g, "/");
          }
          return command;
        })(),
      };

      // Remove script field if it exists
      delete (hookConfig as any).script;

      // Validate the final hook configuration
      const configValidation = this.validator.validateHookConfig(hookConfig);
      if (!configValidation.valid) {
        throw new ValidationError(
          `Hook configuration validation failed: ${configValidation.errors.join(
            ", "
          )}`,
          "configuration"
        );
      }

      if (configValidation.warnings.length > 0) {
        logger.warn(`Configuration warnings for ${hookConfig.name}:`);
        configValidation.warnings.forEach((warning) =>
          logger.warn(`  - ${warning}`)
        );
      }

      // Validate dependencies
      const missingDeps = await this.validator.validateDependencies(hookConfig);
      if (missingDeps.length > 0) {
        logger.warn(`Missing dependencies for ${hookConfig.name}:`);
        missingDeps.forEach((dep) => logger.warn(`  - ${dep}`));
        logger.warn(
          "Hook may not function correctly without these dependencies"
        );
      }

      // Optional: Test hook execution (dry run)
      try {
        logger.debug(`Testing hook: ${hookConfig.name}`);
        const testResult = await this.validator.testHook(
          hookConfig,
          "test input"
        );
        if (!testResult.success && testResult.exitCode !== 2) {
          // Exit code 2 is blocking, which is valid
          logger.warn(
            `Hook test failed for ${hookConfig.name}: ${
              testResult.error || "Unknown error"
            }`
          );
          logger.warn("Hook created but may not function correctly");
        } else {
          logger.debug(`Hook test passed for ${hookConfig.name}`);
        }
      } catch (error: any) {
        logger.warn(`Could not test hook ${hookConfig.name}: ${error.message}`);
      }

      await this.addHook(hookConfig);

      // Save to definitions
      await this.fileManager.saveHookDefinition(hookConfig);

      logger.success(`Created hook from template: ${templateName}`);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create hook from template: ${error.message}`);
    }
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const templatesDir = this.fs.join(PackagePaths.getTemplatesDir(), "hooks");
      const files = await this.fs.readdir(templatesDir);
      return files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""));
    } catch {
      return [];
    }
  }

  /**
   * Find an existing hook by ID
   */
  private async findExistingHook(id: string): Promise<HookConfig | null> {
    const allHooks = this.registry.getAllHooks();
    for (const { hooks } of allHooks) {
      const found = hooks.find((h) => h.config.id === id);
      if (found) {
        return found.config;
      }
    }
    return null;
  }


  /**
   * Get all registered hooks
   */
  getAllHooks(): { event: HookEvent; hooks: any[] }[] {
    return this.registry.getAllHooks();
  }

  /**
   * Clean up old timestamped hooks (migration helper)
   */
  async cleanupTimestampedHooks(): Promise<void> {
    const allHooks = this.registry.getAllHooks();
    await this.fileManager.cleanupTimestampedHooks(allHooks, this.registry);
  }
}
