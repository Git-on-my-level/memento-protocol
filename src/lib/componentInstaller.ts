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
  templates: {
    claude_router?: ComponentMetadata;
    modes: ComponentMetadata[];
    workflows: ComponentMetadata[];
  };
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
    const metadata = await this.loadGlobalMetadata();

    return {
      modes: metadata?.templates.modes || [],
      workflows: metadata?.templates.workflows || [],
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
   * 
   * CRITICAL SAFETY NOTE: Component installation behavior:
   * - With force=false: Will skip if component already exists (preserves custom modifications)
   * - With force=true: Will OVERWRITE existing component with template version
   * 
   * DANGER: The force flag can destroy user customizations!
   * - Users may have spent hours customizing modes/workflows
   * - Always warn users before using force=true
   * - Consider implementing a backup mechanism before overwriting
   * 
   * NEVER delete components that aren't being replaced. Only touch the specific
   * component being installed.
   */
  async installComponent(
    type: "mode" | "workflow",
    name: string,
    force = false
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

    if (componentList.includes(name) && !force) {
      // SAFE: Preserving existing user customization
      logger.warn(`${type} '${name}' is already installed`);
      return;
    }

    // Check dependencies
    const metadata = await this.loadGlobalMetadata();
    const components = type === "mode" ? metadata?.templates.modes : metadata?.templates.workflows;
    const component = components?.find((c) => c.name === name);

    if (component?.dependencies && component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!manifest.components.modes.includes(dep) || force) {
          logger.info(`Installing required dependency: mode '${dep}'`);
          await this.installComponent("mode", dep, force);
        }
      }
    }

    // Copy component file
    const content = await fs.readFile(componentPath, "utf-8");
    const destPath = this.dirManager.getComponentPath(
      type === "mode" ? "modes" : "workflows",
      name
    );

    // WARNING: This writeFile will OVERWRITE any existing custom component if force=true
    // User customizations will be lost! Consider implementing backup before overwriting.
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

    if (force && componentList.includes(name)) {
      logger.success(`Reinstalled ${type} '${name}'`);
    } else {
      logger.success(`Installed ${type} '${name}'`);
    }
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
   * Load global metadata for all templates
   */
  private async loadGlobalMetadata(): Promise<TemplateMetadata | null> {
    const metadataPath = path.join(this.templatesDir, "metadata.json");

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
    const metadata = await this.loadGlobalMetadata();

    for (const workflow of manifest.components.workflows) {
      const meta = metadata?.templates.workflows.find(
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
