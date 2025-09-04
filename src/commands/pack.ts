import { Command } from 'commander';
import { PackRegistry } from '../lib/packs/PackRegistry';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';

export const packCommand = new Command('pack')
  .description('Manage starter packs from various sources')
  .addCommand(createAddPackCommand())
  .addCommand(createListPackCommand())
  .addCommand(createSourceCommand());

/**
 * Command to add/install packs from remote sources
 */
function createAddPackCommand(): Command {
  return new Command('add')
    .description('Install a starter pack')
    .argument('<name>', 'Pack name to install')
    .option('-s, --source <url>', 'Source URL (GitHub repo, remote URL, etc.)')
    .option('--github <repo>', 'GitHub repository (owner/repo format)')
    .option('--branch <branch>', 'Git branch to use (default: main)', 'main')
    .option('--auth-token <token>', 'Authentication token for private repos')
    .option('--cache-ttl <ms>', 'Cache TTL in milliseconds', '300000') // 5 minutes default
    .option('-f, --force', 'Force installation even if pack already exists')
    .option('--dry-run', 'Show what would be installed without actually installing')
    .action(async (packName: string, options: any) => {
      try {
        logger.info(`Installing starter pack: ${chalk.cyan(packName)}`);
        
        const registry = new PackRegistry();
        
        // Register remote source if provided
        if (options.source) {
          const sourceName = `temp-${Date.now()}`;
          registry.registerFromUrl(sourceName, options.source, {
            authToken: options.authToken,
            cacheTtl: parseInt(options.cacheTtl),
            branch: options.branch
          });
          logger.debug(`Registered temporary source: ${sourceName} -> ${options.source}`);
        } else if (options.github) {
          const sourceName = `github-${Date.now()}`;
          const githubUrl = options.github.includes('/')
            ? `https://github.com/${options.github}`
            : `https://github.com/${options.github}`;
          
          registry.registerGitHubFromUrl(sourceName, githubUrl, {
            branch: options.branch,
            authToken: options.authToken,
            cacheTtl: parseInt(options.cacheTtl)
          });
          logger.debug(`Registered temporary GitHub source: ${sourceName} -> ${githubUrl}`);
        }
        
        // Load the pack
        const pack = await registry.loadPack(packName);
        
        logger.info('');
        logger.info(`Pack: ${chalk.cyan(pack.manifest.name)} v${pack.manifest.version}`);
        logger.info(`Author: ${pack.manifest.author}`);
        logger.info(`Description: ${pack.manifest.description}`);
        
        if (pack.manifest.category) {
          logger.info(`Category: ${pack.manifest.category}`);
        }
        
        if (pack.manifest.tags && pack.manifest.tags.length > 0) {
          logger.info(`Tags: ${pack.manifest.tags.join(', ')}`);
        }
        
        // Show components that will be installed
        const components = pack.manifest.components;
        logger.info('');
        logger.info('Components to install:');
        
        if (components.modes && components.modes.length > 0) {
          logger.info(`  Modes: ${components.modes.map(m => m.name).join(', ')}`);
        }
        
        if (components.workflows && components.workflows.length > 0) {
          logger.info(`  Workflows: ${components.workflows.map(w => w.name).join(', ')}`);
        }
        
        if (components.agents && components.agents.length > 0) {
          logger.info(`  Agents: ${components.agents.map(a => a.name).join(', ')}`);
        }
        
        if (components.hooks && components.hooks.length > 0) {
          logger.info(`  Hooks: ${components.hooks.map(h => h.name).join(', ')}`);
        }
        
        // Check dependencies
        if (pack.manifest.dependencies && pack.manifest.dependencies.length > 0) {
          logger.info('');
          logger.info(`Dependencies: ${pack.manifest.dependencies.join(', ')}`);
          
          const depResult = await registry.resolveDependencies(packName);
          if (depResult.missing.length > 0) {
            logger.warn(`Missing dependencies: ${depResult.missing.join(', ')}`);
          }
          if (depResult.circular.length > 0) {
            logger.warn(`Circular dependencies detected: ${depResult.circular.join(', ')}`);
          }
        }
        
        if (options.dryRun) {
          logger.info('');
          logger.info(chalk.yellow('Dry run - no changes made'));
          return;
        }
        
        // Confirm installation
        if (!options.force) {
          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: 'Install this starter pack?',
              default: true
            }
          ]);
          
          if (!confirmed) {
            logger.info('Installation cancelled');
            return;
          }
        }
        
        logger.info('');
        logger.info('Installing pack...');
        
        // TODO: Implement actual pack installation logic
        // This would involve:
        // 1. Installing each component to the appropriate directory
        // 2. Setting up configuration
        // 3. Running post-install actions
        // 4. Updating project pack manifest
        
        logger.warn('Pack installation logic not yet implemented');
        logger.info('This feature will be completed in a future update');
        
      } catch (error) {
        logger.error('Failed to install pack:', error);
        process.exit(1);
      }
    });
}

/**
 * Command to list available packs from sources
 */
function createListPackCommand(): Command {
  return new Command('list')
    .description('List available starter packs')
    .option('-s, --source <url>', 'List packs from specific source')
    .option('--github <repo>', 'List packs from GitHub repository')
    .option('--branch <branch>', 'Git branch to use (default: main)', 'main')
    .option('--auth-token <token>', 'Authentication token for private repos')
    .option('-c, --category <category>', 'Filter by category')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .action(async (options: any) => {
      try {
        const registry = new PackRegistry();
        
        // Register source if provided
        if (options.source) {
          const sourceName = `temp-${Date.now()}`;
          registry.registerFromUrl(sourceName, options.source, {
            authToken: options.authToken,
            branch: options.branch
          });
        } else if (options.github) {
          const sourceName = `github-${Date.now()}`;
          const githubUrl = options.github.includes('/')
            ? `https://github.com/${options.github}`
            : `https://github.com/${options.github}`;
          
          registry.registerGitHubFromUrl(sourceName, githubUrl, {
            branch: options.branch,
            authToken: options.authToken
          });
        }
        
        logger.info('Loading available packs...');
        const packs = await registry.listAvailablePacks();
        
        // Apply filters
        let filteredPacks = packs;
        
        if (options.category) {
          filteredPacks = filteredPacks.filter(pack => 
            pack.manifest.category === options.category
          );
        }
        
        if (options.tags) {
          const requiredTags = options.tags.split(',').map((t: string) => t.trim());
          filteredPacks = filteredPacks.filter(pack => {
            const packTags = pack.manifest.tags || [];
            return requiredTags.every(tag => packTags.includes(tag));
          });
        }
        
        if (filteredPacks.length === 0) {
          logger.info('No packs found matching the criteria');
          return;
        }
        
        logger.info('');
        logger.info(`Found ${filteredPacks.length} starter packs:`);
        logger.info('');
        
        // Group by category for better display
        const categories = new Map<string, typeof filteredPacks>();
        for (const pack of filteredPacks) {
          const category = pack.manifest.category || 'general';
          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)!.push(pack);
        }
        
        for (const [category, categoryPacks] of categories) {
          logger.info(chalk.bold.blue(`${category.toUpperCase()}:`));
          
          for (const pack of categoryPacks) {
            const name = chalk.cyan(pack.manifest.name);
            const version = chalk.dim(`v${pack.manifest.version}`);
            const author = chalk.dim(`by ${pack.manifest.author}`);
            
            logger.info(`  ${name} ${version} ${author}`);
            logger.info(`    ${pack.manifest.description}`);
            
            if (pack.manifest.tags && pack.manifest.tags.length > 0) {
              const tags = pack.manifest.tags.map(tag => chalk.gray(`#${tag}`)).join(' ');
              logger.info(`    ${tags}`);
            }
            logger.info('');
          }
        }
        
      } catch (error) {
        logger.error('Failed to list packs:', error);
        process.exit(1);
      }
    });
}

/**
 * Command to manage pack sources
 */
function createSourceCommand(): Command {
  const sourceCmd = new Command('source')
    .description('Manage pack sources');
    
  sourceCmd
    .command('add')
    .description('Add a pack source')
    .argument('<name>', 'Source name')
    .argument('<url>', 'Source URL')
    .option('--auth-token <token>', 'Authentication token')
    .option('--branch <branch>', 'Default branch for Git sources', 'main')
    .action(async (name: string, url: string, options: any) => {
      logger.info(`Adding pack source: ${chalk.cyan(name)} -> ${url}`);
      logger.warn('Persistent source management not yet implemented');
      logger.info('Use --source flag with pack commands for temporary sources');
    });
  
  sourceCmd
    .command('list')
    .description('List registered pack sources')
    .action(async () => {
      logger.info('Registered pack sources:');
      logger.info('  local - Built-in local starter packs');
      logger.warn('Additional source listing not yet implemented');
    });
  
  sourceCmd
    .command('remove')
    .description('Remove a pack source')
    .argument('<name>', 'Source name to remove')
    .action(async (name: string) => {
      logger.info(`Removing pack source: ${chalk.cyan(name)}`);
      logger.warn('Source removal not yet implemented');
    });
  
  return sourceCmd;
}