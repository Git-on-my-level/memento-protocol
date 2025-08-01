import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import { DirectoryManager } from "./directoryManager";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";

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
    agents: ComponentMetadata[];
  };
}

export class ComponentInstaller {
  private dirManager: DirectoryManager;
  private templatesDir: string;

  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);

    // Use centralized package path resolution
    this.templatesDir = PackagePaths.getTemplatesDir();
  }

  /**
   * List available components from templates
   */
  async listAvailableComponents(): Promise<{
    modes: ComponentMetadata[];
    workflows: ComponentMetadata[];
    agents: ComponentMetadata[];
  }> {
    const metadata = await this.loadGlobalMetadata();

    return {
      modes: metadata?.templates.modes || [],
      workflows: metadata?.templates.workflows || [],
      agents: metadata?.templates.agents || [],
    };
  }

  /**
   * List installed components
   */
  async listInstalledComponents(): Promise<{
    modes: string[];
    workflows: string[];
    agents: string[];
  }> {
    if (!this.dirManager.isInitialized()) {
      return {
        modes: [],
        workflows: [],
        agents: [],
      };
    }
    
    const manifest = await this.dirManager.getManifest();

    return {
      modes: manifest.components.modes || [],
      workflows: manifest.components.workflows || [],
      agents: manifest.components.agents || [],
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
   *
   * NEVER delete components that aren't being replaced. Only touch the specific
   * component being installed.
   */
  async installComponent(
    type: "mode" | "workflow" | "agent",
    name: string,
    force = false
  ): Promise<void> {
    // Check if component exists in templates
    let templateSubdir: string;
    if (type === "mode") {
      templateSubdir = "modes";
    } else if (type === "workflow") {
      templateSubdir = "workflows";
    } else if (type === "agent") {
      templateSubdir = "agents";
    } else {
      throw new Error(`Invalid component type: ${type}`);
    }
    
    const componentPath = path.join(
      this.templatesDir,
      templateSubdir,
      `${name}.md`
    );

    if (!existsSync(componentPath)) {
      throw new Error(`Component ${type} '${name}' not found in templates`);
    }

    // Check if already installed
    let manifest = await this.dirManager.getManifest();
    let componentList: string[];
    if (type === "mode") {
      componentList = manifest.components.modes;
    } else if (type === "workflow") {
      componentList = manifest.components.workflows;
    } else if (type === "agent") {
      componentList = manifest.components.agents || [];
    } else {
      throw new Error(`Invalid component type: ${type}`);
    }

    if (componentList.includes(name) && !force) {
      // SAFE: Preserving existing user customization
      logger.warn(`${type} '${name}' is already installed`);
      return;
    }

    // Check dependencies
    const metadata = await this.loadGlobalMetadata();
    let components: ComponentMetadata[] | undefined;
    if (type === "mode") {
      components = metadata?.templates.modes;
    } else if (type === "workflow") {
      components = metadata?.templates.workflows;
    } else if (type === "agent") {
      components = metadata?.templates.agents;
    }
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
    let destType: "modes" | "workflows" | "integrations" | "agents";
    if (type === "mode") {
      destType = "modes";
    } else if (type === "workflow") {
      destType = "workflows";
    } else if (type === "agent") {
      destType = "agents";
    } else {
      throw new Error(`Invalid component type: ${type}`);
    }
    
    const destPath = this.dirManager.getComponentPath(destType, name);

    // WARNING: This writeFile will OVERWRITE any existing custom component if force=true
    await fs.writeFile(destPath, content);

    // Reload manifest to get any updates from dependency installation
    manifest = await this.dirManager.getManifest();
    if (type === "mode") {
      componentList = manifest.components.modes;
    } else if (type === "workflow") {
      componentList = manifest.components.workflows;
    } else if (type === "agent") {
      componentList = manifest.components.agents || [];
      // Ensure agents array exists in manifest
      if (!manifest.components.agents) {
        manifest.components.agents = [];
        componentList = manifest.components.agents;
      }
    } else {
      throw new Error(`Invalid component type: ${type}`);
    }

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
  async interactiveInstall(type: "mode" | "workflow" | "agent"): Promise<void> {
    const available = await this.listAvailableComponents();
    let components: ComponentMetadata[];
    if (type === "mode") {
      components = available.modes;
    } else if (type === "workflow") {
      components = available.workflows;
    } else if (type === "agent") {
      components = available.agents;
    } else {
      throw new Error(`Invalid component type: ${type}`);
    }

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

    // Check agent dependencies (though agents typically don't have dependencies)
    if (manifest.components.agents) {
      for (const agent of manifest.components.agents) {
        const meta = metadata?.templates.agents?.find(
          (c) => c.name === agent
        );
        if (meta?.dependencies && meta.dependencies.length > 0) {
          const missingDeps = meta.dependencies.filter(
            (dep) => !manifest.components.modes.includes(dep)
          );

          if (missingDeps.length > 0) {
            missing.push({
              component: `agent:${agent}`,
              dependencies: missingDeps,
            });
          }
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
