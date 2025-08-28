import { Command } from "commander";
import { UpdateManager } from "../lib/updateManager";
import { logger } from "../lib/logger";

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
    .addHelpText('after', `
Examples:
  $ memento update                                # Update all components
  $ memento update --check                        # Check for updates without installing
  $ memento update --force                        # Force update, overwriting local changes
  $ memento update mode:engineer                  # Update specific engineer mode
  $ memento update workflow:review                # Update specific review workflow
  $ memento update mode:architect --force         # Force update architect mode

Checking for updates:
  $ memento update --check                        # See available updates
  $ memento update mode:engineer --check          # Check specific component only

Handling local modifications:
  $ memento update                                # Will warn about local changes
  $ memento update --force                        # Override local changes
  $ memento update diff mode:engineer             # View differences before updating

Component format:
  mode:engineer                                   # Update engineer mode
  workflow:review                                # Update code review workflow
  mode:autonomous-project-manager                 # Update specific mode by full name

Update workflow:
  $ memento update --check                        # 1. Check what updates are available
  $ memento update diff mode:engineer             # 2. Review changes if needed
  $ memento update mode:engineer                  # 3. Apply the update
  $ memento update --force                        # 4. Force update all if conflicts

Safety features:
  - Local modifications are detected and preserved by default
  - Use --force only when you want to discard local changes
  - Use 'diff' subcommand to review changes before updating
  - Backup recommendations are shown for important changes
`)
    .action(async (component: string | undefined, options: any) => {
      try {
        const projectRoot = process.cwd();
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

          logger.info('\nRun "memento update" to install all updates');
          logger.info(
            'Run "memento update <component>" to update a specific component'
          );
          return;
        }

        if (component) {
          // Update specific component
          const [type, name] = component.split(":");

          if (!["mode", "workflow"].includes(type) || !name) {
            throw new Error(
              'Invalid component format. Use "mode:name" or "workflow:name"'
            );
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
        // Check if this is a "not initialized" error and provide helpful guidance
        if (error.message.includes("Memento Protocol is not initialized")) {
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
        const [type, name] = component.split(":");

        if (!["mode", "workflow"].includes(type) || !name) {
          throw new Error(
            'Invalid component format. Use "mode:name" or "workflow:name"'
          );
        }

        const projectRoot = process.cwd();
        const updateManager = new UpdateManager(projectRoot);

        await updateManager.showDiff(type as "mode" | "workflow", name);
      } catch (error: any) {
        // Provide more specific error guidance
        if (error.message.includes("Invalid component format")) {
          logger.error("Invalid component format. Use format: mode:name or workflow:name");
          logger.info("Examples: mode:engineer, workflow:review, mode:autonomous-project-manager");
        } else if (error.message.includes("not found") || error.message.includes("does not exist")) {
          logger.error(`Component not found: ${error.message}`);
          logger.info("Run 'memento list' to see available components");
        } else {
          logger.error(`Failed to show diff: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}
