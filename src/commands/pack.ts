import { Command } from 'commander';
import { StarterPackManager } from '../lib/StarterPackManager';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import { PackStructure } from '../lib/types/packs';
import { isForce } from '../lib/context';

export const packCommand = new Command('pack')
  .description('Manage starter packs')
  .addCommand(
    new Command('list')
      .description('List all available starter packs')
      .option('-c, --category <category>', 'Filter by category (frontend, backend, fullstack, etc.)')
      .option('-v, --verbose', 'Show detailed pack information')
      .action(async (options) => {
        try {
          const starterPackManager = new StarterPackManager(process.cwd());
          const packs = await starterPackManager.listPacks();
          
          if (packs.length === 0) {
            logger.info('No starter packs available.');
            return;
          }
          
          // Filter by category if specified
          let filteredPacks = packs;
          if (options.category) {
            filteredPacks = packs.filter(pack => 
              pack.manifest.category?.toLowerCase() === options.category.toLowerCase()
            );
            
            if (filteredPacks.length === 0) {
              logger.info(`No starter packs found for category '${options.category}'.`);
              logger.info(`Available categories: ${getAvailableCategories(packs).join(', ')}`);
              return;
            }
          }
          
          if (options.verbose) {
            await showPacksDetailed(filteredPacks);
          } else {
            await showPacksSummary(filteredPacks);
          }
          
        } catch (error) {
          logger.error('Failed to list starter packs:', error);
          process.exitCode = 1;
        }
      })
  )
  .addCommand(
    new Command('show')
      .argument('<name>', 'Pack name to show details for')
      .description('Show detailed information about a specific starter pack')
      .action(async (name: string) => {
        try {
          const starterPackManager = new StarterPackManager(process.cwd());
          
          // Check if pack exists
          const exists = await starterPackManager.hasPack(name);
          if (!exists) {
            logger.error(`Starter pack '${name}' not found.`);
            logger.info('');
            logger.info('Run "zcc pack list" to see available packs.');
            process.exitCode = 1;
            return;
          }
          
          const pack = await starterPackManager.loadPack(name);
          await showPackDetails(pack);
          
        } catch (error) {
          logger.error('Failed to show starter pack details:', error);
          process.exitCode = 1;
        }
      })
  )
  .addCommand(
    new Command('install')
      .argument('[name]', 'Pack name to install')
      .description('Install a starter pack')
      .option('-f, --force', 'Force installation even if components exist')
      .action(async (name: string | undefined, options) => {
        try {
          const starterPackManager = new StarterPackManager(process.cwd());
          let packName = name;
          if (!packName) {
            const packs = await starterPackManager.listPacks();
            if (packs.length === 0) {
              logger.info('No starter packs available.');
              return;
            }
            const inquirer = await import('inquirer');
            const answer = await inquirer.default.prompt([
              {
                type: 'list',
                name: 'pack',
                message: 'Select a pack to install',
                choices: packs.map(p => ({ name: p.manifest.name, value: p.manifest.name })),
              },
            ]);
            packName = answer.pack;
          }

          logger.info(`Installing starter pack '${packName}'...`);
          const forceFlag = options.force || isForce();
          const result = await starterPackManager.installPack(packName, { force: forceFlag });

          if (result.success) {
            logger.info(chalk.green(`✓ Successfully installed starter pack '${packName}'`));
            if (result.postInstallMessage) {
              logger.info('');
              logger.info(result.postInstallMessage);
            }
          } else {
            logger.error(result.errors.join('\n'));
            process.exitCode = 1;
          }
        } catch (error) {
          logger.error('Failed to install starter pack:', error);
          process.exitCode = 1;
        }
      })
  )
  .addCommand(
    new Command('uninstall')
      .argument('<name>', 'Pack name to uninstall')
      .description('Uninstall a starter pack and remove all its components')
      .option('-f, --force', 'Force uninstall even if there are errors')
      .action(async (name: string, options) => {
        try {
          const starterPackManager = new StarterPackManager(process.cwd());
          
          // Check if pack is installed
          const installedPacks = await starterPackManager.getInstalledPacks();
          if (!installedPacks[name]) {
            logger.error(`Starter pack '${name}' is not installed.`);
            process.exitCode = 1;
            return;
          }
          
          logger.info(`Uninstalling starter pack '${name}'...`);
          
          const result = await starterPackManager.uninstallPack(name);
          
          if (result.success) {
            logger.info(chalk.green(`✓ Successfully uninstalled starter pack '${name}'`));
            
            // Show what was removed
            const removed = result.installed; // Using 'installed' field which contains removed items
            const totalRemoved = 
              removed.modes.length + 
              removed.workflows.length + 
              removed.agents.length + 
              removed.hooks.length;
            
            if (totalRemoved > 0) {
              logger.info('');
              logger.info('Removed components:');
              if (removed.modes.length > 0) {
                logger.info(`  ${chalk.blue('Modes:')} ${removed.modes.join(', ')}`);
              }
              if (removed.workflows.length > 0) {
                logger.info(`  ${chalk.green('Workflows:')} ${removed.workflows.join(', ')}`);
              }
              if (removed.agents.length > 0) {
                logger.info(`  ${chalk.yellow('Agents:')} ${removed.agents.join(', ')}`);
              }
              if (removed.hooks.length > 0) {
                logger.info(`  ${chalk.magenta('Hooks:')} ${removed.hooks.join(', ')}`);
              }
            }
            
            // Show what was skipped
            const skipped = result.skipped;
            const totalSkipped = 
              skipped.modes.length + 
              skipped.workflows.length + 
              skipped.agents.length + 
              skipped.hooks.length;
            
            if (totalSkipped > 0) {
              logger.info('');
              logger.info(chalk.yellow('Skipped (shared with other packs):'));
              if (skipped.modes.length > 0) {
                logger.info(`  ${chalk.blue('Modes:')} ${skipped.modes.join(', ')}`);
              }
              if (skipped.workflows.length > 0) {
                logger.info(`  ${chalk.green('Workflows:')} ${skipped.workflows.join(', ')}`);
              }
              if (skipped.agents.length > 0) {
                logger.info(`  ${chalk.yellow('Agents:')} ${skipped.agents.join(', ')}`);
              }
              if (skipped.hooks.length > 0) {
                logger.info(`  ${chalk.magenta('Hooks:')} ${skipped.hooks.join(', ')}`);
              }
            }
          } else {
            logger.error(chalk.red(`✗ Failed to uninstall starter pack '${name}'`));
            
            if (result.errors.length > 0) {
              logger.error('');
              logger.error('Errors:');
              for (const error of result.errors) {
                logger.error(`  • ${error}`);
              }
            }
            
            if (!options.force) {
              logger.info('');
              logger.info(chalk.dim('Use --force to attempt uninstall despite errors'));
            }
            
            process.exitCode = 1;
          }
          
        } catch (error) {
          logger.error('Failed to uninstall starter pack:', error);
          process.exitCode = 1;
        }
      })
  )
  .addCommand(
    new Command('update')
      .argument('[name]', 'Pack name to update')
      .description('Update installed starter packs')
      .option('-c, --check', 'Check for available updates without installing')
      .action(async (name: string | undefined, options) => {
        try {
          const starterPackManager = new StarterPackManager(process.cwd());
          const installed = await starterPackManager.getInstalledPacks();
          const targets = name ? [name] : Object.keys(installed);

          if (options.check) {
            if (targets.length === 0) {
              logger.info('No packs installed.');
            } else {
              logger.info('Installed packs:');
              for (const p of targets) {
                logger.info(`  ${p}`);
              }
              logger.info('Run without --check to update.');
            }
            return;
          }

          for (const p of targets) {
            logger.info(`Updating starter pack '${p}'...`);
            const result = await starterPackManager.installPack(p, { force: true });
            if (result.success) {
              logger.info(chalk.green(`✓ Updated starter pack '${p}'`));
            } else {
              logger.error(`Failed to update pack '${p}': ${result.errors.join(', ')}`);
              process.exitCode = 1;
            }
          }
        } catch (error) {
          logger.error('Failed to update starter packs:', error);
          process.exitCode = 1;
        }
      })
  );

/**
 * Show packs in a summary format (compact listing)
 */
async function showPacksSummary(packs: PackStructure[]): Promise<void> {
  logger.info(chalk.bold('Available Starter Packs:'));
  logger.info('');
  
  // Group packs by category
  const packsByCategory = groupPacksByCategory(packs);
  
  for (const [category, categoryPacks] of Object.entries(packsByCategory)) {
    if (categoryPacks.length === 0) continue;
    
    logger.info(chalk.blue(`${category.charAt(0).toUpperCase() + category.slice(1)}:`));
    
    for (const pack of categoryPacks) {
      const componentCount = getTotalComponentCount(pack);
      const componentText = componentCount === 1 ? 'component' : 'components';
      
      logger.info(`  ${chalk.green('●')} ${pack.manifest.name} - ${pack.manifest.description}`);
      logger.info(`    ${chalk.dim(`${componentCount} ${componentText} • ${pack.manifest.author} • v${pack.manifest.version}`)}`);
    }
    logger.info('');
  }
  
  logger.info(chalk.dim('Run "zcc pack show <name>" for detailed information about a pack.'));
  logger.info(chalk.dim('Run "zcc pack install <name>" to install a pack.'));
}

/**
 * Show packs in detailed format
 */
async function showPacksDetailed(packs: PackStructure[]): Promise<void> {
  logger.info(chalk.bold('Available Starter Packs:'));
  logger.info('');
  
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    
    logger.info(chalk.bold(`${pack.manifest.name} (v${pack.manifest.version})`));
    logger.info(`  ${pack.manifest.description}`);
    logger.info(`  ${chalk.dim(`Category: ${pack.manifest.category || 'general'} • Author: ${pack.manifest.author}`)}`);
    
    // Show component counts
    const components = pack.manifest.components;
    const counts: string[] = [];
    if (components.modes?.length) counts.push(`${components.modes.length} mode${components.modes.length !== 1 ? 's' : ''}`);
    if (components.workflows?.length) counts.push(`${components.workflows.length} workflow${components.workflows.length !== 1 ? 's' : ''}`);
    if (components.agents?.length) counts.push(`${components.agents.length} agent${components.agents.length !== 1 ? 's' : ''}`);
    if (components.hooks?.length) counts.push(`${components.hooks.length} hook${components.hooks.length !== 1 ? 's' : ''}`);
    
    if (counts.length > 0) {
      logger.info(`  ${chalk.cyan('Components:')} ${counts.join(', ')}`);
    }
    
    // Show tags
    if (pack.manifest.tags && pack.manifest.tags.length > 0) {
      logger.info(`  ${chalk.cyan('Tags:')} ${pack.manifest.tags.join(', ')}`);
    }
    
    // Show compatibility
    if (pack.manifest.compatibleWith && pack.manifest.compatibleWith.length > 0) {
      logger.info(`  ${chalk.cyan('Compatible with:')} ${pack.manifest.compatibleWith.join(', ')}`);
    }
    
    if (i < packs.length - 1) {
      logger.info('');
    }
  }
  
  if (packs.length > 0) {
    logger.info('');
    logger.info(chalk.dim('Run "zcc pack show <name>" for detailed information about a pack.'));
    logger.info(chalk.dim('Run "zcc pack install <name>" to install a pack.'));
  }
}

/**
 * Show detailed information about a single pack
 */
async function showPackDetails(pack: PackStructure): Promise<void> {
  const manifest = pack.manifest;
  
  logger.info(chalk.bold(`${manifest.name} (v${manifest.version})`));
  logger.info('');
  logger.info(manifest.description);
  logger.info('');
  
  // Basic info
  logger.info(chalk.bold('Package Information:'));
  logger.info(`  ${chalk.cyan('Author:')} ${manifest.author}`);
  logger.info(`  ${chalk.cyan('Category:')} ${manifest.category || 'general'}`);
  logger.info(`  ${chalk.cyan('Version:')} ${manifest.version}`);
  
  if (manifest.tags && manifest.tags.length > 0) {
    logger.info(`  ${chalk.cyan('Tags:')} ${manifest.tags.join(', ')}`);
  }
  
  if (manifest.compatibleWith && manifest.compatibleWith.length > 0) {
    logger.info(`  ${chalk.cyan('Compatible with:')} ${manifest.compatibleWith.join(', ')}`);
  }
  
  logger.info('');
  
  // Components breakdown
  logger.info(chalk.bold('Components:'));
  const components = manifest.components;
  
  if (components.modes && components.modes.length > 0) {
    logger.info(`  ${chalk.blue('Modes:')} (${components.modes.length})`);
    for (const mode of components.modes) {
      const requiredBadge = mode.required ? chalk.red(' [required]') : chalk.dim(' [optional]');
      const description = mode.description ? ` - ${mode.description}` : '';
      logger.info(`    • ${mode.name}${requiredBadge}${description}`);
    }
  }
  
  if (components.workflows && components.workflows.length > 0) {
    logger.info(`  ${chalk.green('Workflows:')} (${components.workflows.length})`);
    for (const workflow of components.workflows) {
      const requiredBadge = workflow.required ? chalk.red(' [required]') : chalk.dim(' [optional]');
      const description = workflow.description ? ` - ${workflow.description}` : '';
      logger.info(`    • ${workflow.name}${requiredBadge}${description}`);
    }
  }
  
  if (components.agents && components.agents.length > 0) {
    logger.info(`  ${chalk.yellow('Agents:')} (${components.agents.length})`);
    for (const agent of components.agents) {
      const requiredBadge = agent.required ? chalk.red(' [required]') : chalk.dim(' [optional]');
      const description = agent.description ? ` - ${agent.description}` : '';
      logger.info(`    • ${agent.name}${requiredBadge}${description}`);
    }
  }
  
  if (components.hooks && components.hooks.length > 0) {
    logger.info(`  ${chalk.magenta('Hooks:')} (${components.hooks.length})`);
    for (const hook of components.hooks) {
      const description = hook.description ? ` - ${hook.description}` : '';
      logger.info(`    • ${hook.name}${description}`);
    }
  }
  
  // Configuration
  if (manifest.configuration) {
    logger.info('');
    logger.info(chalk.bold('Configuration:'));
    
    if (manifest.configuration.defaultMode) {
      logger.info(`  ${chalk.cyan('Default mode:')} ${manifest.configuration.defaultMode}`);
    }
    
    if (manifest.configuration.customCommands) {
      logger.info(`  ${chalk.cyan('Custom commands:')} (${Object.keys(manifest.configuration.customCommands).length})`);
      for (const [cmd, config] of Object.entries(manifest.configuration.customCommands)) {
        logger.info(`    /${cmd} - ${config.description}`);
      }
    }
  }
  
  // Dependencies
  if (manifest.dependencies && manifest.dependencies.length > 0) {
    logger.info('');
    logger.info(chalk.bold('Dependencies:'));
    for (const dep of manifest.dependencies) {
      logger.info(`  • ${dep}`);
    }
  }
  
  // Post-install information
  if (manifest.postInstall?.message) {
    logger.info('');
    logger.info(chalk.bold('After Installation:'));
    // Split the message by lines and indent each line
    const lines = manifest.postInstall.message.split('\n');
    for (const line of lines) {
      logger.info(`  ${line}`);
    }
  }
  
  logger.info('');
  logger.info(chalk.dim(`To install this pack: zcc pack install ${manifest.name}`));
}

/**
 * Group packs by category
 */
function groupPacksByCategory(packs: PackStructure[]): Record<string, PackStructure[]> {
  const groups: Record<string, PackStructure[]> = {};
  
  for (const pack of packs) {
    const category = pack.manifest.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(pack);
  }
  
  // Sort within each category by name
  for (const category of Object.keys(groups)) {
    groups[category].sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  }
  
  return groups;
}

/**
 * Get total component count for a pack
 */
function getTotalComponentCount(pack: PackStructure): number {
  const components = pack.manifest.components;
  return (
    (components.modes?.length || 0) +
    (components.workflows?.length || 0) +
    (components.agents?.length || 0) +
    (components.hooks?.length || 0)
  );
}

/**
 * Get available categories from packs
 */
function getAvailableCategories(packs: PackStructure[]): string[] {
  const categories = new Set<string>();
  for (const pack of packs) {
    categories.add(pack.manifest.category || 'general');
  }
  return Array.from(categories).sort();
}