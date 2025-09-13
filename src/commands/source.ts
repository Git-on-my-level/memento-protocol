import { Command } from 'commander';
import { SourceRegistry, SourceConfig } from '../lib/sources/SourceRegistry';
import { TrustManager } from '../lib/security/TrustManager';
import { shouldProceedWithoutPrompt } from '../lib/context';
import * as path from 'path';
import * as chalk from 'chalk';
import inquirer from 'inquirer';

export const sourceCommand = new Command('source')
  .description('Manage pack sources')
  .addCommand(
    new Command('list')
      .description('List all configured pack sources')
      .option('-v, --verbose', 'Show detailed source information')
      .action(async (options) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          await registry.initialize();
          
          const configs = registry.getAllSourceConfigs();
          const defaultSource = registry.getDefaultSource();
          
          if (configs.length === 0) {
            console.log(chalk.yellow('No pack sources configured'));
            return;
          }
          
          console.log(chalk.bold('\nConfigured Pack Sources:\n'));
          
          for (const config of configs) {
            const isDefault = config.id === defaultSource;
            const status = config.enabled ? chalk.green('enabled') : chalk.gray('disabled');
            const defaultLabel = isDefault ? chalk.cyan(' (default)') : '';
            
            console.log(`${chalk.bold(config.id)}${defaultLabel} - ${status}`);
            
            if (options.verbose) {
              console.log(`  Type: ${config.type}`);
              console.log(`  Priority: ${config.priority}`);
              
              if (config.type === 'github') {
                console.log(`  Repository: ${config.config.owner}/${config.config.repo}`);
                console.log(`  Branch: ${config.config.branch || 'main'}`);
              } else if (config.type === 'local') {
                console.log(`  Path: ${config.config.path}`);
              }
              
              // Try to list packs from this source
              const source = registry.getSource(config.id);
              if (source && config.enabled) {
                try {
                  const packs = await source.listPacks();
                  console.log(`  Available packs: ${packs.length}`);
                  if (packs.length > 0 && packs.length <= 10) {
                    console.log(`    ${packs.join(', ')}`);
                  }
                } catch (error: any) {
                  console.log(chalk.red(`  Error: ${error.message}`));
                }
              }
              console.log();
            }
          }
        } catch (error: any) {
          console.error(chalk.red(`Error listing sources: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a new pack source')
      .argument('<id>', 'Unique identifier for the source')
      .option('-t, --type <type>', 'Source type (local, github, http)', 'github')
      .option('-o, --owner <owner>', 'GitHub repository owner (for github type)')
      .option('-r, --repo <repo>', 'GitHub repository name (for github type)')
      .option('-b, --branch <branch>', 'GitHub branch name', 'main')
      .option('-d, --directory <dir>', 'Directory containing packs', 'packs')
      .option('-p, --path <path>', 'Local path (for local type)')
      .option('--token <token>', 'GitHub personal access token (for private repos)')
      .option('--trust', 'Mark this source as trusted')
      .option('--priority <number>', 'Source priority (lower = higher priority)', '10')
      .action(async (id, options) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          const trustManager = new TrustManager(projectRoot);
          
          await registry.initialize();
          await trustManager.initialize();
          
          // Validate input based on type
          if (options.type === 'github' && (!options.owner || !options.repo)) {
            console.error(chalk.red('GitHub sources require --owner and --repo options'));
            process.exit(1);
          }
          
          if (options.type === 'local' && !options.path) {
            console.error(chalk.red('Local sources require --path option'));
            process.exit(1);
          }
          
          // Build source configuration
          const config: SourceConfig = {
            id,
            type: options.type,
            enabled: true,
            priority: parseInt(options.priority, 10),
            config: {},
          };
          
          if (options.type === 'github') {
            config.config = {
              owner: options.owner,
              repo: options.repo,
              branch: options.branch,
              directory: options.directory,
              token: options.token,
              trustLevel: options.trust ? 'trusted' : 'untrusted',
            };
          } else if (options.type === 'local') {
            config.config = {
              path: path.resolve(options.path),
            };
          }
          
          // Show confirmation
          if (!shouldProceedWithoutPrompt()) {
            console.log(chalk.bold('\nSource Configuration:'));
            console.log(`  ID: ${id}`);
            console.log(`  Type: ${options.type}`);
            
            if (options.type === 'github') {
              console.log(`  Repository: ${options.owner}/${options.repo}`);
              console.log(`  Branch: ${options.branch}`);
              console.log(`  Directory: ${options.directory}`);
            } else if (options.type === 'local') {
              console.log(`  Path: ${config.config.path}`);
            }
            
            console.log(`  Trust Level: ${options.trust ? 'trusted' : 'untrusted'}`);
            console.log(`  Priority: ${options.priority}`);
            
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: 'Add this source?',
                default: true,
              },
            ]);
            
            if (!confirm) {
              console.log(chalk.yellow('Cancelled'));
              return;
            }
          }
          
          // Add the source
          await registry.addSource(config);
          
          // Add to trusted sources if requested
          if (options.trust) {
            await trustManager.addTrustedSource(id, {
              type: options.type,
              trusted: true,
              description: `Added via CLI`,
            });
          }
          
          console.log(chalk.green(`\n✓ Source '${id}' added successfully`));
          
          // Try to list packs from the new source
          const source = registry.getSource(id);
          if (source) {
            try {
              const packs = await source.listPacks();
              console.log(chalk.dim(`  Found ${packs.length} pack(s)${packs.length > 0 ? ': ' + packs.slice(0, 5).join(', ') + (packs.length > 5 ? '...' : '') : ''}`));
            } catch (error: any) {
              console.warn(chalk.yellow(`  Warning: Could not list packs: ${error.message}`));
            }
          }
        } catch (error: any) {
          console.error(chalk.red(`Error adding source: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove a pack source')
      .argument('<id>', 'Source identifier to remove')
      .action(async (id, options) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          const trustManager = new TrustManager(projectRoot);
          
          await registry.initialize();
          await trustManager.initialize();
          
          const config = registry.getSourceConfig(id);
          if (!config) {
            console.error(chalk.red(`Source '${id}' not found`));
            process.exit(1);
          }
          
          if (id === 'local') {
            console.error(chalk.red('Cannot remove the local source'));
            process.exit(1);
          }
          
          // Confirm removal
          if (!shouldProceedWithoutPrompt()) {
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `Remove source '${id}'?`,
                default: false,
              },
            ]);
            
            if (!confirm) {
              console.log(chalk.yellow('Cancelled'));
              return;
            }
          }
          
          // Remove the source
          await registry.removeSource(id);
          await trustManager.removeTrustedSource(id);
          
          console.log(chalk.green(`\n✓ Source '${id}' removed successfully`));
        } catch (error: any) {
          console.error(chalk.red(`Error removing source: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('enable')
      .description('Enable a pack source')
      .argument('<id>', 'Source identifier to enable')
      .action(async (id) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          await registry.initialize();
          
          await registry.updateSource(id, { enabled: true });
          console.log(chalk.green(`\n✓ Source '${id}' enabled`));
        } catch (error: any) {
          console.error(chalk.red(`Error enabling source: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('disable')
      .description('Disable a pack source')
      .argument('<id>', 'Source identifier to disable')
      .action(async (id) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          await registry.initialize();
          
          if (id === 'local') {
            console.error(chalk.red('Cannot disable the local source'));
            process.exit(1);
          }
          
          await registry.updateSource(id, { enabled: false });
          console.log(chalk.green(`\n✓ Source '${id}' disabled`));
        } catch (error: any) {
          console.error(chalk.red(`Error disabling source: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('trust')
      .description('Manage source trust settings')
      .argument('<id>', 'Source identifier')
      .option('--add', 'Add source to trusted list')
      .option('--remove', 'Remove source from trusted list')
      .option('--check', 'Check if source is trusted')
      .action(async (id, options) => {
        try {
          const projectRoot = process.cwd();
          const trustManager = new TrustManager(projectRoot);
          await trustManager.initialize();
          
          if (options.check) {
            const isTrusted = trustManager.isTrustedSource(id);
            console.log(`Source '${id}' is ${isTrusted ? chalk.green('trusted') : chalk.yellow('untrusted')}`);
          } else if (options.add) {
            await trustManager.addTrustedSource(id, {
              type: 'manual',
              trusted: true,
              addedAt: new Date().toISOString(),
            });
            console.log(chalk.green(`\n✓ Source '${id}' added to trusted list`));
          } else if (options.remove) {
            await trustManager.removeTrustedSource(id);
            console.log(chalk.green(`\n✓ Source '${id}' removed from trusted list`));
          } else {
            console.error(chalk.red('Please specify --add, --remove, or --check'));
            process.exit(1);
          }
        } catch (error: any) {
          console.error(chalk.red(`Error managing trust: ${error.message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set-default')
      .description('Set the default pack source')
      .argument('<id>', 'Source identifier to set as default')
      .action(async (id) => {
        try {
          const projectRoot = process.cwd();
          const registry = new SourceRegistry(projectRoot);
          await registry.initialize();
          
          const config = registry.getSourceConfig(id);
          if (!config) {
            console.error(chalk.red(`Source '${id}' not found`));
            process.exit(1);
          }
          
          if (!config.enabled) {
            console.error(chalk.red(`Source '${id}' is disabled. Enable it first.`));
            process.exit(1);
          }
          
          registry.setDefaultSource(id);
          await registry['saveConfiguration'](); // Access private method
          
          console.log(chalk.green(`\n✓ Default source set to '${id}'`));
        } catch (error: any) {
          console.error(chalk.red(`Error setting default source: ${error.message}`));
          process.exit(1);
        }
      })
  );