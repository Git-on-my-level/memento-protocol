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
    
    // Load hook definitions
    await this.loadHookDefinitions();
    
    // Generate Claude settings
    await this.generateClaudeSettings();
    
    // Generate built-in hooks
    await this.generateBuiltinHooks();
    
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
      priority: 100 // High priority to run first
    };
    
    this.registry.addHook(routingConfig);
  }

  /**
   * Generate or update .claude/settings.toml
   */
  private async generateClaudeSettings(): Promise<void> {
    // Ensure .claude directory exists
    await fs.mkdir(this.claudeDir, { recursive: true });
    
    const settingsPath = path.join(this.claudeDir, 'settings.toml');
    
    // Get all hooks from registry
    const allHooks = this.registry.getAllHooks();
    
    // Use a Set to track unique hook combinations (event + command) to prevent duplicates
    const uniqueHooks = new Set<string>();
    
    // Build settings content
    let settingsContent = '';
    
    for (const { event, hooks } of allHooks) {
      for (const hook of hooks) {
        if (!hook.enabled) continue;
        
        // Create a unique key for this hook (event + command + args)
        const argsString = hook.config.args ? JSON.stringify(hook.config.args) : '';
        const hookKey = `${event}:${hook.config.command}:${argsString}`;
        
        // Skip if we've already seen this exact hook combination
        if (uniqueHooks.has(hookKey)) {
          logger.debug(`Skipping duplicate hook: ${hook.config.name} (${hookKey})`);
          continue;
        }
        
        uniqueHooks.add(hookKey);
        
        settingsContent += `
[[hooks]]
event = "${event}"
command = "${hook.config.command}"
`;
        
        if (hook.config.args && hook.config.args.length > 0) {
          settingsContent += `args = ${JSON.stringify(hook.config.args)}\n`;
        }
      }
    }
    
    // Check if we need to merge with existing settings
    try {
      const existing = await fs.readFile(settingsPath, 'utf-8');
      
      // Simple check to avoid duplicates
      if (!existing.includes('# Memento Protocol Hooks')) {
        settingsContent = existing + '\n# Memento Protocol Hooks\n' + settingsContent;
      } else {
        // Replace the Memento section
        const beforeMemento = existing.substring(0, existing.indexOf('# Memento Protocol Hooks'));
        settingsContent = beforeMemento + '# Memento Protocol Hooks\n' + settingsContent;
      }
    } catch {
      // File doesn't exist, add header
      settingsContent = '# Memento Protocol Hooks\n' + settingsContent;
    }
    
    await fs.writeFile(settingsPath, settingsContent.trim() + '\n');
    logger.info('Updated .claude/settings.toml');
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
      
      // Generate hook ID
      const hookId = config.id || `${templateName}-${Date.now()}`;
      
      // Handle script-based hooks
      let command = template.command;
      if (template.script && !template.command) {
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
        
        // Create script file
        const scriptsDir = path.join(this.hooksDir, 'scripts');
        await fs.mkdir(scriptsDir, { recursive: true });
        const scriptPath = path.join(scriptsDir, `${hookId}.sh`);
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
   * Get all registered hooks
   */
  getAllHooks(): { event: HookEvent; hooks: any[] }[] {
    return this.registry.getAllHooks();
  }

}