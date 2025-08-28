import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { ComponentInstaller } from "./componentInstaller";
import { UpdateManager } from "./updateManager";
import { logger } from "./logger";
import { DirectoryManager } from "./directoryManager";
import { CommandGenerator } from "./commandGenerator";

export class UpsertManager {
  private installer: ComponentInstaller;
  private updater: UpdateManager;
  private dirManager: DirectoryManager;
  private commandGenerator: CommandGenerator;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.dirManager = new DirectoryManager(projectRoot, this.fs);
    this.installer = new ComponentInstaller(projectRoot, this.fs);
    this.updater = new UpdateManager(projectRoot, this.fs);
    this.commandGenerator = new CommandGenerator(projectRoot, this.fs);
  }

  async upsert(force = false) {
    if (!this.dirManager.isInitialized()) {
      logger.warn(
        "Memento Protocol not initialized. Running initialization..."
      );
      await this.dirManager.initializeStructure();
    }

    logger.info(
      "Performing upsert: installing new components and updating existing ones..."
    );

    // 1. Get available and installed components
    logger.progress('Analyzing component differences');
    const available = await this.installer.listAvailableComponents();
    const installed = await this.installer.listInstalledComponents();
    logger.clearProgress();

    // 2. Install new modes
    const newModes = available.modes.filter(
      (mode) => !installed.modes.includes(mode.name)
    );
    if (newModes.length > 0) {
      logger.progress(`Installing ${newModes.length} new modes`);
      for (let i = 0; i < newModes.length; i++) {
        const mode = newModes[i];
        logger.step(i + 1, newModes.length, `Installing mode ${mode.name}`);
        await this.installer.installComponent("mode", mode.name, force);
      }
      logger.clearProgress();
      logger.success(`Installed ${newModes.length} new modes`);
    }

    // 3. Install new workflows
    const newWorkflows = available.workflows.filter(
      (workflow) => !installed.workflows.includes(workflow.name)
    );
    if (newWorkflows.length > 0) {
      logger.progress(`Installing ${newWorkflows.length} new workflows`);
      for (let i = 0; i < newWorkflows.length; i++) {
        const workflow = newWorkflows[i];
        logger.step(i + 1, newWorkflows.length, `Installing workflow ${workflow.name}`);
        await this.installer.installComponent("workflow", workflow.name, force);
      }
      logger.clearProgress();
      logger.success(`Installed ${newWorkflows.length} new workflows`);
    }

    // 4. Update existing components
    logger.progress('Checking for updates to existing components');
    await this.updater.updateAll(force);
    logger.clearProgress();

    // 5. Regenerate custom commands
    logger.progress('Updating Claude Code custom commands');
    await this.commandGenerator.initialize();
    logger.clearProgress();
    logger.success('Custom commands updated');

    logger.success("Upsert complete.");
  }
}
