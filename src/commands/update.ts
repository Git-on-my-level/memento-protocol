import { Command } from 'commander';
import { UpdateManager } from '../lib/updateManager';
import { logger } from '../lib/logger';

export function createUpdateCommand(): Command {
  const cmd = new Command('update');
  
  cmd
    .description('Update components from template repository')
    .option('-c, --check', 'check for available updates without installing')
    .option('-f, --force', 'force update even with local modifications')
    .argument('[component]', 'specific component to update (e.g., mode:architect)')
    .action(async (component: string | undefined, options: any) => {
      try {
        const projectRoot = process.cwd();
        const updateManager = new UpdateManager(projectRoot);

        if (options.check) {
          // Check for updates
          logger.info('Checking for component updates...');
          const updates = await updateManager.checkForUpdates();
          
          if (updates.length === 0) {
            logger.success('All components are up to date');
            return;
          }

          logger.info(`Found ${updates.length} update(s):\n`);
          updates.forEach(update => {
            const warning = update.hasLocalChanges ? ' (has local changes)' : '';
            logger.info(`  ${update.type}:${update.component} - v${update.currentVersion} → v${update.latestVersion}${warning}`);
          });

          logger.info('\nRun "memento update" to install all updates');
          logger.info('Run "memento update <component>" to update a specific component');
          return;
        }

        if (component) {
          // Update specific component
          const [type, name] = component.split(':');
          
          if (!['mode', 'workflow'].includes(type) || !name) {
            throw new Error('Invalid component format. Use "mode:name" or "workflow:name"');
          }

          logger.info(`Updating ${type} '${name}'...`);
          await updateManager.updateComponent(type as 'mode' | 'workflow', name, options.force);
        } else {
          // Update all components
          logger.info('Updating all components...');
          await updateManager.updateAll(options.force);
        }

      } catch (error: any) {
        logger.error(`Update failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Add subcommand for showing diffs
  cmd
    .command('diff <component>')
    .description('Show differences between installed and template version')
    .action(async (component: string) => {
      try {
        const [type, name] = component.split(':');
        
        if (!['mode', 'workflow'].includes(type) || !name) {
          throw new Error('Invalid component format. Use "mode:name" or "workflow:name"');
        }

        const projectRoot = process.cwd();
        const updateManager = new UpdateManager(projectRoot);
        
        await updateManager.showDiff(type as 'mode' | 'workflow', name);
      } catch (error: any) {
        logger.error(`Failed to show diff: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}