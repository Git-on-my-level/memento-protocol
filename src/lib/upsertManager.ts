import { ComponentInstaller } from "./componentInstaller";
import { UpdateManager } from "./updateManager";
import { logger } from "./logger";
import { DirectoryManager } from "./directoryManager";

export class UpsertManager {
  private installer: ComponentInstaller;
  private updater: UpdateManager;
  private dirManager: DirectoryManager;

  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);
    this.installer = new ComponentInstaller(projectRoot);
    this.updater = new UpdateManager(projectRoot);
  }

  async upsert(force = false) {
    if (!this.dirManager.isInitialized()) {
      logger.warn(
        "Memento Protocol not initialized. Running initialization..."
      );
      // It might be better to call the init command's logic directly
      // For now, we'll just inform the user.
      logger.error('Project not initialized. Please run "memento init" first.');
      return;
    }

    logger.info(
      "Performing upsert: installing new components and updating existing ones..."
    );

    // 1. Get available and installed components
    const available = await this.installer.listAvailableComponents();
    const installed = await this.installer.listInstalledComponents();

    // 2. Install new modes
    const newModes = available.modes.filter(
      (mode) => !installed.modes.includes(mode.name)
    );
    if (newModes.length > 0) {
      logger.info("Installing new modes...");
      for (const mode of newModes) {
        await this.installer.installComponent("mode", mode.name, force);
      }
    }

    // 3. Install new workflows
    const newWorkflows = available.workflows.filter(
      (workflow) => !installed.workflows.includes(workflow.name)
    );
    if (newWorkflows.length > 0) {
      logger.info("Installing new workflows...");
      for (const workflow of newWorkflows) {
        await this.installer.installComponent("workflow", workflow.name, force);
      }
    }

    // 4. Update existing components
    logger.info("Checking for updates to existing components...");
    await this.updater.updateAll(force);

    logger.success("Upsert complete.");
  }
}
