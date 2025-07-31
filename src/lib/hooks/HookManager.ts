import * as fs from 'fs/promises';
import * as path from 'path';
import { HookRegistry } from './HookRegistry';
import { HookConfig, HookDefinition, HookEvent } from './types';
import { logger } from '../logger';
import { HookConfigLoader } from './HookConfigLoader';
import { MementoRoutingHook } from './builtin/MementoRoutingHook';
import { PackagePaths } from '../packagePaths';
import { HookValidator } from './HookValidator';
import { ValidationError } from '../errors';

export class HookManager {
  private registry: HookRegistry;
  private configLoader: HookConfigLoader;
  private validator: HookValidator;
  private projectRoot: string;
  private claudeDir: string;
  private mementoDir: string;
  private hooksDir: string;
  private definitionsDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.claudeDir = path.join(projectRoot, '.claude');
    this.mementoDir = path.join(projectRoot, '.memento');
    this.hooksDir = path.join(this.mementoDir, 'hooks');
    this.definitionsDir = path.join(this.hooksDir, 'definitions');
    
    this.registry = new HookRegistry();
    this.configLoader = new HookConfigLoader(this.definitionsDir);
    this.validator = new HookValidator(projectRoot);
  }

  /**
   * Initialize the hook system
   */
  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Generate built-in hooks first
    await this.generateBuiltinHooks();
    
    // Load hook definitions
    await this.loadHookDefinitions();
    
    // Clean up old timestamped hooks
    await this.cleanupTimestampedHooks();
    
    // Generate Claude settings
    await this.generateClaudeSettings();
    
    logger.success('Hook system initialized');
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.claudeDir, { recursive: true });
    await fs.mkdir(this.hooksDir, { recursive: true });
    await fs.mkdir(this.definitionsDir, { recursive: true });
    await fs.mkdir(path.join(this.hooksDir, 'scripts'), { recursive: true });
    await fs.mkdir(path.join(this.hooksDir, 'templates'), { recursive: true });
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
    // Generate the Memento routing hook
    const routingHook = new MementoRoutingHook(this.projectRoot);
    await routingHook.generate();
    
    // Add it to the registry
    const routingConfig: HookConfig = {
      id: 'memento-routing',
      name: 'Memento Routing Hook',
      description: 'Routes modes, workflows, and tickets based on user prompts',
      event: 'UserPromptSubmit',
      enabled: true,
      command: path.join(this.hooksDir, 'scripts', 'memento-routing.sh'),
      priority: 100, // High priority to run first
      requirements: {
        commands: ['jq', 'grep', 'sed', 'cat', 'echo', 'ls', 'basename']
      }
    };
    
    this.registry.addHook(routingConfig);
    
    // Save routing hook definition
    const definitionPath = path.join(this.definitionsDir, 'memento-routing.json');
    const definition: HookDefinition = {
      version: '1.0.0',
      hooks: [routingConfig]
    };
    
    await fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
  }

  /**
   * Generate or update .claude/settings.local.json
   */
  private async generateClaudeSettings(): Promise<void> {
    // Ensure .claude directory exists
    await fs.mkdir(this.claudeDir, { recursive: true });
    
    const settingsPath = path.join(this.claudeDir, 'settings.local.json');
    
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
          priority: hook.config.priority || 50 // Default priority
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
        const argsString = hook.config.args ? JSON.stringify(hook.config.args) : '';
        const dedupeKey = `${event}:${hook.config.command}:${argsString}`;
        
        // Skip if we've already seen this exact hook combination
        if (uniqueHooks.has(dedupeKey)) {
          logger.debug(`Skipping duplicate hook: ${hook.config.name} (${dedupeKey})`);
          continue;
        }
        
        uniqueHooks.add(dedupeKey);
        
        // Convert absolute paths to relative paths for portability
        let hookCommand = hook.config.command;
        if (hookCommand.startsWith(this.projectRoot)) {
          hookCommand = '.' + hookCommand.substring(this.projectRoot.length);
        }
        
        // Initialize the event array if it doesn't exist
        if (!hooksConfig[event]) {
          hooksConfig[event] = [];
        }
        
        // Determine the matcher pattern
        let matcher = '*';
        if (event === 'PreToolUse' || event === 'PostToolUse') {
          // For tool hooks, use the specific tool name
          if (hook.config.matcher && hook.config.matcher.type === 'tool' && hook.config.matcher.pattern) {
            matcher = hook.config.matcher.pattern;
          } else {
            logger.warn(`PreToolUse/PostToolUse hook ${hook.config.name} missing tool matcher`);
            continue;
          }
        }
        
        // Create the hook entry
        const hookEntry: any = {
          matcher,
          hooks: [
            {
              type: 'command',
              command: hookCommand,
              timeout: 30,
              ...(hook.config.args && hook.config.args.length > 0 && { args: hook.config.args })
            }
          ]
        };
        
        hooksConfig[event].push(hookEntry);
    }
    
    // Read existing settings and merge
    let existingSettings: any = {};
    try {
      const existingContent = await fs.readFile(settingsPath, 'utf-8');
      existingSettings = JSON.parse(existingContent);
    } catch {
      // File doesn't exist or is invalid JSON, start fresh
    }
    
    // Merge hooks into existing settings, preserving existing hooks within the same event
    const existingHooks = existingSettings.hooks || {};
    const mergedHooks = { ...existingHooks };
    
    // For each event, merge hooks instead of replacing
    for (const [event, newHooksList] of Object.entries(hooksConfig)) {
      if (!mergedHooks[event]) {
        mergedHooks[event] = [];
      }
      
      // Add new hooks that don't already exist
      for (const newHook of newHooksList as any[]) {
        const existingHook = mergedHooks[event].find((h: any) => 
          h.matcher === newHook.matcher && 
          h.hooks[0]?.command === newHook.hooks[0]?.command
        );
        
        if (!existingHook) {
          mergedHooks[event].push(newHook);
        }
      }
    }
    
    const newSettings = {
      ...existingSettings,
      hooks: mergedHooks
    };
    
    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    logger.info('Updated .claude/settings.local.json');
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
      await this.removeHookFiles(hook);
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
  async createHookFromTemplate(templateName: string, config: Partial<HookConfig>): Promise<void> {
    const templatePath = path.join(PackagePaths.getTemplatesDir(), 'hooks', `${templateName}.json`);
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template: any = JSON.parse(templateContent);
      
      // Use clean ID without timestamp
      const hookId = config.id || templateName;
      
      // Check if hook already exists and remove it first
      const existingHook = await this.findExistingHook(hookId);
      if (existingHook) {
        logger.info(`Updating existing hook: ${hookId}`);
        await this.removeHookFiles(existingHook);
        this.registry.removeHook(hookId);
      }
      
      // Handle script-based hooks
      let command = template.command;
      
      // Check if template expects a script file
      if (template.command === '${HOOK_SCRIPT}') {
        // Look for corresponding .sh file
        const scriptTemplatePath = path.join(PackagePaths.getTemplatesDir(), 'hooks', `${templateName}.sh`);
        try {
          const scriptContent = await fs.readFile(scriptTemplatePath, 'utf-8');
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
            `Script validation failed: ${scriptValidation.errors.join(', ')}`,
            'script'
          );
        }
        
        if (scriptValidation.warnings.length > 0) {
          logger.warn(`Script warnings for ${templateName}:`);
          scriptValidation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
        }
        
        // Create script file with clean name
        const scriptsDir = path.join(this.hooksDir, 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });
        const scriptPath = path.join(scriptsDir, `${templateName}.sh`);
        await fs.writeFile(scriptPath, template.script, { mode: 0o755 });
        command = scriptPath;
      }
      
      // Merge template with provided config
      const hookConfig: HookConfig = {
        ...template,
        ...config,
        id: hookId,
        name: config.name || template.name || templateName,
        command: command
      };
      
      // Remove script field if it exists
      delete (hookConfig as any).script;
      
      // Validate the final hook configuration
      const configValidation = this.validator.validateHookConfig(hookConfig);
      if (!configValidation.valid) {
        throw new ValidationError(
          `Hook configuration validation failed: ${configValidation.errors.join(', ')}`,
          'configuration'
        );
      }
      
      if (configValidation.warnings.length > 0) {
        logger.warn(`Configuration warnings for ${hookConfig.name}:`);
        configValidation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
      }
      
      // Validate dependencies
      const missingDeps = await this.validator.validateDependencies(hookConfig);
      if (missingDeps.length > 0) {
        logger.warn(`Missing dependencies for ${hookConfig.name}:`);
        missingDeps.forEach(dep => logger.warn(`  - ${dep}`));
        logger.warn('Hook may not function correctly without these dependencies');
      }
      
      // Optional: Test hook execution (dry run)
      try {
        logger.debug(`Testing hook: ${hookConfig.name}`);
        const testResult = await this.validator.testHook(hookConfig, 'test input');
        if (!testResult.success && testResult.exitCode !== 2) { // Exit code 2 is blocking, which is valid
          logger.warn(`Hook test failed for ${hookConfig.name}: ${testResult.error || 'Unknown error'}`);
          logger.warn('Hook created but may not function correctly');
        } else {
          logger.debug(`Hook test passed for ${hookConfig.name}`);
        }
      } catch (error: any) {
        logger.warn(`Could not test hook ${hookConfig.name}: ${error.message}`);
      }
      
      await this.addHook(hookConfig);
      
      // Ensure definitions directory exists before saving
      await fs.mkdir(this.definitionsDir, { recursive: true });
      
      // Save to definitions
      const definitionPath = path.join(this.definitionsDir, `${hookConfig.id}.json`);
      const definition: HookDefinition = {
        version: '1.0.0',
        hooks: [hookConfig]
      };
      
      await fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
      
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
      const templatesDir = path.join(PackagePaths.getTemplatesDir(), 'hooks');
      const files = await fs.readdir(templatesDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
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
      const found = hooks.find(h => h.config.id === id);
      if (found) {
        return found.config;
      }
    }
    return null;
  }

  /**
   * Remove hook files (definition and script)
   */
  private async removeHookFiles(hook: HookConfig): Promise<void> {
    // Remove definition file
    const definitionPath = path.join(this.definitionsDir, `${hook.id}.json`);
    try {
      await fs.unlink(definitionPath);
    } catch (error) {
      // File might not exist, ignore
    }

    // Remove script file if it's in our scripts directory
    if (hook.command && hook.command.includes(this.hooksDir)) {
      try {
        await fs.unlink(hook.command);
      } catch (error) {
        // File might not exist, ignore
      }
    }
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
    const timestampPattern = /-\d{13}$/; // Matches -[13 digits] at end
    const hooksToCleanup: Array<{ oldHook: any; baseName: string }> = [];
    
    // First, collect all hooks that need cleanup
    for (const { hooks } of allHooks) {
      for (const hook of hooks) {
        if (timestampPattern.test(hook.config.id)) {
          const baseName = hook.config.id.replace(timestampPattern, '');
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
      if (cleanConfig.command && cleanConfig.command.includes(oldHook.config.id)) {
        const oldScriptPath = cleanConfig.command;
        const newScriptPath = oldScriptPath.replace(oldHook.config.id, baseName);
        
        // Rename script file
        try {
          await fs.rename(oldScriptPath, newScriptPath);
          cleanConfig.command = newScriptPath;
        } catch (error) {
          logger.warn(`Could not rename script file: ${error}`);
        }
      }
      
      // Remove old hook from registry
      this.registry.removeHook(oldHook.config.id);
      
      // Add clean hook
      this.registry.addHook(cleanConfig);
      
      // Save new definition
      await fs.mkdir(this.definitionsDir, { recursive: true });
      const definitionPath = path.join(this.definitionsDir, `${baseName}.json`);
      const definition: HookDefinition = {
        version: '1.0.0',
        hooks: [cleanConfig]
      };
      await fs.writeFile(definitionPath, JSON.stringify(definition, null, 2));
      
      // Remove old definition
      const oldDefinitionPath = path.join(this.definitionsDir, `${oldHook.config.id}.json`);
      try {
        await fs.unlink(oldDefinitionPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }

}