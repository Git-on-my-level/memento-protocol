import { Command } from "commander";
import { UpdateManager } from "../lib/updateManager";
import { logger } from "../lib/logger";
import { DirectoryManager } from "../lib/directoryManager";
import { UPDATE_ERROR_MESSAGES } from "../lib/errorMessages";

interface UpdateCommandOptions {
  check?: boolean;
  force?: boolean;
}

export function createUpdateCommand(): Command {
  const cmd = new Command("update");

  cmd
    .description("Update components from template repository")
    .option("-c, --check", "check for available updates without installing")
    .option("-f, --force", "force update even with local modifications")
    .argument(
      "[component]",
      "specific component to update (e.g., mode:architect)"
    )
    .action(async (component: string | undefined, options: UpdateCommandOptions) => {
      try {
        const projectRoot = process.cwd();
        
        // Check if zcc is initialized
        const dirManager = new DirectoryManager(projectRoot);
        if (!dirManager.isInitialized()) {
          throw new Error(UPDATE_ERROR_MESSAGES.NOT_INITIALIZED());
        }
        
        const updateManager = new UpdateManager(projectRoot);

        if (options.check) {
          // Check for updates
          logger.info("Checking for component updates...");
          const updates = await updateManager.checkForUpdates();

          if (updates.length === 0) {
            logger.success("All components are up to date");
            return;
          }

          logger.info(`Found ${updates.length} update(s):\n`);
          updates.forEach((update) => {
            const warning = update.hasLocalChanges
              ? " (has local changes)"
              : "";
            logger.info(
              `  ${update.type}:${update.component} - v${update.currentVersion} → v${update.latestVersion}${warning}`
            );
          });

          logger.info('\nRun "zcc update" to install all updates');
          logger.info(
            'Run "zcc update <component>" to update a specific component'
          );
          return;
        }

        if (component) {
          // Update specific component
          const parts = component.split(":");
          
          if (parts.length !== 2) {
            throw new Error(UPDATE_ERROR_MESSAGES.INVALID_COMPONENT_FORMAT(component));
          }
          
          const [type, name] = parts;
          
          if (!["mode", "workflow"].includes(type)) {
            throw new Error(UPDATE_ERROR_MESSAGES.INVALID_COMPONENT_TYPE(type));
          }
          
          if (!name || name.trim() === '') {
            throw new Error(UPDATE_ERROR_MESSAGES.EMPTY_COMPONENT_NAME());
          }

          logger.info(`Updating ${type} '${name}'...`);
          await updateManager.updateComponent(
            type as "mode" | "workflow",
            name,
            options.force || false
          );
        } else {
          // Update all components
          logger.info("Updating all components...");
          await updateManager.updateAll(options.force || false);
        }
      } catch (error: any) {
        // Use the full error message if it already contains helpful guidance
        if (error.message.includes("\n")) {
          logger.error(error.message);
        } else {
          logger.error(`Update failed: ${error.message}`);
        }
        process.exit(1);
      }
    });

  // Add subcommand for showing diffs
  cmd
    .command("diff <component>")
    .description("Show differences between installed and template version")
    .action(async (component: string) => {
      try {
        const projectRoot = process.cwd();
        
        // Check if zcc is initialized
        const dirManager = new DirectoryManager(projectRoot);
        if (!dirManager.isInitialized()) {
          throw new Error(UPDATE_ERROR_MESSAGES.NOT_INITIALIZED());
        }
        
        const parts = component.split(":");
        
        if (parts.length !== 2) {
          throw new Error(UPDATE_ERROR_MESSAGES.INVALID_COMPONENT_FORMAT(component));
        }
        
        const [type, name] = parts;
        
        if (!["mode", "workflow"].includes(type)) {
          throw new Error(UPDATE_ERROR_MESSAGES.INVALID_COMPONENT_TYPE_DIFF(type));
        }
        
        if (!name || name.trim() === '') {
          throw new Error(UPDATE_ERROR_MESSAGES.EMPTY_COMPONENT_NAME_DIFF());
        }
        
        const updateManager = new UpdateManager(projectRoot);

        await updateManager.showDiff(type as "mode" | "workflow", name);
      } catch (error: any) {
        logger.error(`Failed to show diff: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
