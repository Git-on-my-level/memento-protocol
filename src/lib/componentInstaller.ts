import matter from "gray-matter";
import { DirectoryManager } from "./directoryManager";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";
import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";

interface ComponentMetadata {
  name: string;
  description: string;
  author?: string;
  version?: string;
  tags: string[];
  dependencies: string[];
  tools?: string; // For agents
  model?: string; // For agents
  event?: string; // For hooks
  priority?: number; // For hooks
}


export class ComponentInstaller {
  private dirManager: DirectoryManager;
  private templatesDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter, templatesDir?: string) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.dirManager = new DirectoryManager(projectRoot, this.fs);

    // Use provided templatesDir or fall back to centralized package path resolution
    this.templatesDir = templatesDir || PackagePaths.getTemplatesDir();
  }

  /**
   * Parse frontmatter from a template file
   */
  private async parseTemplateFrontmatter(filePath: string): Promise<ComponentMetadata | null> {
    try {
      const content = await this.fs.readFile(filePath, "utf-8") as string;
      const parsed = matter(content);
      const data = parsed.data;

      // Validate required fields
      if (!data.name || !data.description) {
        logger.warn(`Template ${filePath} missing required frontmatter fields (name, description)`);
        return null;
      }

      return {
        name: data.name,
        description: data.description,
        author: data.author,
        version: data.version,
        tags: data.tags || [],
        dependencies: data.dependencies || [],
        tools: data.tools,
        model: data.model,
        event: data.event,
        priority: data.priority,
      };
    } catch (error) {
      logger.warn(`Error parsing frontmatter from ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Scan a directory for template files and parse their metadata
   */
  private async scanComponentDirectory(dirPath: string, extension = ".md"): Promise<ComponentMetadata[]> {
    const components: ComponentMetadata[] = [];
    
    if (!(await this.fs.exists(dirPath))) {
      return components;
    }

    try {
      const files = await this.fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith(extension)) {
          const filePath = this.fs.join(dirPath, file);
          const metadata = await this.parseTemplateFrontmatter(filePath);
          
          if (metadata) {
            components.push(metadata);
          }
        }
      }
    } catch (error) {
      logger.warn(`Error scanning directory ${dirPath}: ${error}`);
    }
    
    return components;
  }

  /**
   * List available components from templates using frontmatter parsing
   */
  async listAvailableComponents(): Promise<{
    modes: ComponentMetadata[];
    workflows: ComponentMetadata[];
    agents: ComponentMetadata[];
  }> {
    const modesPath = this.fs.join(this.templatesDir, "modes");
    const workflowsPath = this.fs.join(this.templatesDir, "workflows");
    const agentsPath = this.fs.join(this.templatesDir, "agents");

    const [modes, workflows, agents] = await Promise.all([
      this.scanComponentDirectory(modesPath),
      this.scanComponentDirectory(workflowsPath),
      this.scanComponentDirectory(agentsPath),
    ]);

    return { modes, workflows, agents };
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
    
    const componentPath = this.fs.join(
      this.templatesDir,
      templateSubdir,
      `${name}.md`
    );

    if (!(await this.fs.exists(componentPath))) {
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

    // Check dependencies using frontmatter parsing
    const componentMetadata = await this.parseTemplateFrontmatter(componentPath);
    const component = componentMetadata;

    if (component?.dependencies && component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!manifest.components.modes.includes(dep) || force) {
          logger.info(`Installing required dependency: mode '${dep}'`);
          await this.installComponent("mode", dep, force);
        }
      }
    }

    // Copy component file
    const content = await this.fs.readFile(componentPath, "utf-8") as string;
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
    await this.fs.writeFile(destPath, content);

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
   * Validate component dependencies are satisfied
   */
  async validateDependencies(): Promise<{
    valid: boolean;
    missing: { component: string; dependencies: string[] }[];
  }> {
    const manifest = await this.dirManager.getManifest();
    const missing: { component: string; dependencies: string[] }[] = [];

    // Check workflow dependencies
    const workflowsPath = this.fs.join(this.templatesDir, "workflows");
    for (const workflow of manifest.components.workflows) {
      const workflowPath = this.fs.join(workflowsPath, `${workflow}.md`);
      const meta = await this.parseTemplateFrontmatter(workflowPath);
      
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
      const agentsPath = this.fs.join(this.templatesDir, "agents");
      for (const agent of manifest.components.agents) {
        const agentPath = this.fs.join(agentsPath, `${agent}.md`);
        const meta = await this.parseTemplateFrontmatter(agentPath);
        
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
