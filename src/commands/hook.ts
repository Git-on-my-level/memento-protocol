import { Command } from 'commander';
import * as path from 'path';
import { HookManager } from '../lib/hooks/HookManager';
import { logger } from '../lib/logger';
import { handleError } from '../lib/errors';
import * as fs from 'fs/promises';

const hookCommand = new Command('hook')
  .description('Manage Claude Code hooks')
  .addHelpText('after', `
Examples:
  $ memento hook list                    # List all configured hooks
  $ memento hook add code-formatter      # Add a hook from template
  $ memento hook enable acronym-expander # Enable a hook
  $ memento hook disable test-on-save    # Disable a hook
  $ memento hook remove my-hook          # Remove a hook
`);

// List hooks subcommand
hookCommand
  .command('list')
  .description('List all configured hooks')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const hookManager = new HookManager(projectRoot);
      
      // Initialize to load hooks
      await hookManager.initialize();
      
      const hooks = hookManager.getAllHooks();
      
      if (hooks.length === 0) {
        logger.info('No hooks configured');
        return;
      }
      
      logger.info('Configured Hooks:');\n      logger.space();
      
      for (const { event, hooks: eventHooks } of hooks) {
        if (eventHooks.length > 0) {
          logger.info(`  ${event}:`);
          for (const hook of eventHooks) {
            const status = hook.enabled ? '✓' : '✗';
            logger.info(`    ${status} ${hook.name} (${hook.id})`);
            if (hook.config.description) {
              logger.info(`       ${hook.config.description}`);
            }
          }
          logger.space();
        }
      }
    } catch (error) {
      handleError(error);
    }
  });

// Add hook subcommand
hookCommand
  .command('add <template>')
  .description('Add a hook from a template')
  .option('--id <id>', 'Custom hook ID')
  .option('--name <name>', 'Custom hook name')
  .action(async (template, options) => {
    try {
      const projectRoot = process.cwd();
      const hookManager = new HookManager(projectRoot);
      
      await hookManager.createHookFromTemplate(template, {
        id: options.id,
        name: options.name
      });
      
      logger.success(`Added hook from template: ${template}`);
    } catch (error) {
      handleError(error);
    }
  });

// Enable hook subcommand
hookCommand
  .command('enable <id>')
  .description('Enable a hook')
  .action(async (id) => {
    try {
      const projectRoot = process.cwd();
      const definitionsDir = path.join(projectRoot, '.memento', 'hooks', 'definitions');
      
      // Find and update the hook definition
      const files = await fs.readdir(definitionsDir).catch(() => []);
      let found = false;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(definitionsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const definition = JSON.parse(content);
        
        for (const hook of definition.hooks) {
          if (hook.id === id) {
            hook.enabled = true;
            found = true;
            await fs.writeFile(filePath, JSON.stringify(definition, null, 2));
            break;
          }
        }
        
        if (found) break;
      }
      
      if (found) {
        logger.success(`Enabled hook: ${id}`);
        logger.info('Run "memento" to regenerate hook configuration');
      } else {
        logger.error(`Hook not found: ${id}`);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Disable hook subcommand
hookCommand
  .command('disable <id>')
  .description('Disable a hook')
  .action(async (id) => {
    try {
      const projectRoot = process.cwd();
      const definitionsDir = path.join(projectRoot, '.memento', 'hooks', 'definitions');
      
      // Find and update the hook definition
      const files = await fs.readdir(definitionsDir).catch(() => []);
      let found = false;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(definitionsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const definition = JSON.parse(content);
        
        for (const hook of definition.hooks) {
          if (hook.id === id) {
            hook.enabled = false;
            found = true;
            await fs.writeFile(filePath, JSON.stringify(definition, null, 2));
            break;
          }
        }
        
        if (found) break;
      }
      
      if (found) {
        logger.success(`Disabled hook: ${id}`);
        logger.info('Run "memento" to regenerate hook configuration');
      } else {
        logger.error(`Hook not found: ${id}`);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Remove hook subcommand
hookCommand
  .command('remove <id>')
  .description('Remove a hook')
  .action(async (id) => {
    try {
      const projectRoot = process.cwd();
      const hookManager = new HookManager(projectRoot);
      
      const removed = await hookManager.removeHook(id);
      
      if (removed) {
        logger.success(`Removed hook: ${id}`);
      } else {
        logger.error(`Hook not found: ${id}`);
      }
    } catch (error) {
      handleError(error);
    }
  });

// List templates subcommand
hookCommand
  .command('templates')
  .description('List available hook templates')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const hookManager = new HookManager(projectRoot);
      
      const templates = await hookManager.listTemplates();
      
      if (templates.length === 0) {
        logger.info('No hook templates available');
        return;
      }
      
      logger.info('Available Hook Templates:');\n      logger.space();
      
      for (const template of templates) {
        logger.info(`  - ${template}`);
      }
      logger.space();\n      logger.info('Use "memento hook add <template>" to add a hook');
    } catch (error) {
      handleError(error);
    }
  });

export { hookCommand };