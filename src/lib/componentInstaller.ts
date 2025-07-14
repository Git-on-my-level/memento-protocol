import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import { DirectoryManager } from "./directoryManager";
import { logger } from "./logger";

interface ComponentMetadata {
  name: string;
  description: string;
  tags: string[];
  dependencies: string[];
}

interface TemplateMetadata {
  version: string;
  components: ComponentMetadata[];
}

export class ComponentInstaller {
  private dirManager: DirectoryManager;
  private templatesDir: string;

  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);

    // Determine where the bundled templates live.
    // 1. Prefer a top-level <projectRoot>/templates directory – this exists when running the CLI
    //    directly from the source repository during development.
    // 2. Fallback to <dist>/templates next to the compiled entrypoint – this is the location used
    //    in the packaged build that is published to npm.

    const repoTemplatesDir = path.join(projectRoot, "templates");

    if (existsSync(repoTemplatesDir)) {
      this.templatesDir = repoTemplatesDir;
    } else {
      this.templatesDir = path.join(
        path.dirname(require.main?.filename || __dirname),
        "templates"
      );
    }
  }

  /**
   * List available components from templates
   */
  async listAvailableComponents(): Promise<{
    modes: ComponentMetadata[];
    workflows: ComponentMetadata[];
  }> {
    const modesMetadata = await this.loadMetadata("modes");
    const workflowsMetadata = await this.loadMetadata("workflows");

    return {
      modes: modesMetadata?.components || [],
      workflows: workflowsMetadata?.components || [],
    };
  }

  /**
   * List installed components
   */
  async listInstalledComponents(): Promise<{
    modes: string[];
    workflows: string[];
  }> {
    const manifest = await this.dirManager.getManifest();

    return {
      modes: manifest.components.modes || [],
      workflows: manifest.components.workflows || [],
    };
  }

  /**
   * Install a specific component
   */
  async installComponent(
    type: "mode" | "workflow",
    name: string
  ): Promise<void> {
    // Check if component exists in templates
    const componentPath = path.join(
      this.templatesDir,
      type === "mode" ? "modes" : "workflows",
      `${name}.md`
    );

    if (!existsSync(componentPath)) {
      throw new Error(`Component ${type} '${name}' not found in templates`);
    }

    // Check if already installed
    let manifest = await this.dirManager.getManifest();
    let componentList =
      type === "mode"
        ? manifest.components.modes
        : manifest.components.workflows;

    if (componentList.includes(name)) {
      logger.warn(`${type} '${name}' is already installed`);
      return;
    }

    // Check dependencies
    const metadata = await this.loadMetadata(
      type === "mode" ? "modes" : "workflows"
    );
    const component = metadata?.components.find((c) => c.name === name);

    if (component?.dependencies && component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!manifest.components.modes.includes(dep)) {
          logger.info(`Installing required dependency: mode '${dep}'`);
          await this.installComponent("mode", dep);
        }
      }
    }

    // Copy component file
    const content = await fs.readFile(componentPath, "utf-8");
    const destPath = this.dirManager.getComponentPath(
      type === "mode" ? "modes" : "workflows",
      name
    );

    await fs.writeFile(destPath, content);

    // Reload manifest to get any updates from dependency installation
    manifest = await this.dirManager.getManifest();
    componentList =
      type === "mode"
        ? manifest.components.modes
        : manifest.components.workflows;

    // Update manifest
    if (!componentList.includes(name)) {
      componentList.push(name);
    }
    manifest.components.updated = new Date().toISOString();
    await this.dirManager.updateManifest(manifest);

    logger.success(`Installed ${type} '${name}'`);
  }

  /**
   * Interactive component installation
   */
  async interactiveInstall(type: "mode" | "workflow"): Promise<void> {
    const available = await this.listAvailableComponents();
    const components = type === "mode" ? available.modes : available.workflows;

    if (components.length === 0) {
      logger.error(`No ${type}s available for installation`);
      return;
    }

    // For now, we'll list components and ask user to specify
    // In a full implementation, this would use inquirer or similar
    logger.info(`Available ${type}s:`);
    components.forEach((comp) => {
      logger.info(`  - ${comp.name}: ${comp.description}`);
    });
    logger.info("");
    logger.info(
      `Run "memento add ${type} <name>" to install a specific ${type}`
    );
  }

  /**
   * Load metadata for a component type
   */
  private async loadMetadata(
    type: "modes" | "workflows"
  ): Promise<TemplateMetadata | null> {
    const metadataPath = path.join(this.templatesDir, type, "metadata.json");

    if (!existsSync(metadataPath)) {
      return null;
    }

    const content = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Validate component dependencies are satisfied
   */
  async validateDependencies(): Promise<{
    valid: boolean;
    missing: { component: string; dependencies: string[] }[];
  }> {
    const manifest = await this.dirManager.getManifest();
    const missing: { component: string; dependencies: string[] }[] = [];

    // Check workflow dependencies
    const workflowsMetadata = await this.loadMetadata("workflows");

    for (const workflow of manifest.components.workflows) {
      const meta = workflowsMetadata?.components.find(
        (c) => c.name === workflow
      );
      if (meta?.dependencies && meta.dependencies.length > 0) {
        const missingDeps = meta.dependencies.filter(
          (dep) => !manifest.components.modes.includes(dep)
        );

        if (missingDeps.length > 0) {
          missing.push({
            component: `workflow:${workflow}`,
            dependencies: missingDeps,
          });
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
