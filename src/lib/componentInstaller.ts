import matter from "gray-matter";
import { DirectoryManager } from "./directoryManager";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";
import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { ComponentTypeRegistry } from "./ComponentTypeRegistry";

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
  private typeRegistry: ComponentTypeRegistry;

  constructor(projectRoot: string, fs?: FileSystemAdapter, templatesDir?: string) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.dirManager = new DirectoryManager(projectRoot, this.fs);
    this.typeRegistry = ComponentTypeRegistry.getInstance(this.fs);

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
    const result: any = {};
    
    // Use registry to get component types that support listing
    const typesToList = ['mode', 'workflow', 'agent'];
    
    for (const type of typesToList) {
      const pluralKey = type + 's';
      const directory = this.typeRegistry.getDirectory(type);
      if (directory) {
        const dirPath = this.fs.join(this.templatesDir, directory);
        const extension = this.typeRegistry.getFileExtension(type) || '.md';
        result[pluralKey] = await this.scanComponentDirectory(dirPath, extension);
      } else {
        result[pluralKey] = [];
      }
    }

    return result;
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
    // Validate component type using registry
    if (!this.typeRegistry.validateType(type)) {
      throw new Error(`Invalid component type: ${type}. Valid types: ${this.typeRegistry.getValidTypes().join(', ')}`);
    }

    // Get component path using registry
    const templateSubdir = this.typeRegistry.getTemplateSubdir(type);
    if (!templateSubdir) {
      throw new Error(`No template directory configured for type: ${type}`);
    }
    
    const fileExtension = this.typeRegistry.getFileExtension(type) || '.md';
    const componentPath = this.fs.join(
      this.templatesDir,
      templateSubdir,
      `${name}${fileExtension}`
    );

    // Check if component already exists in installed location (e.g., from starter packs)
    const destType = this.mapTypeToDestination(type);
    const destPath = this.dirManager.getComponentPath(destType, name);
    const alreadyInstalled = await this.fs.exists(destPath);

    // Only validate against templates if the component is not already installed
    if (!alreadyInstalled && !(await this.fs.exists(componentPath))) {
      throw new Error(`Component ${type} '${name}' not found in templates`);
    }

    // Check if already installed
    let manifest = await this.dirManager.getManifest();
    let componentList: string[] = this.getManifestComponentList(manifest, type);

    if (componentList.includes(name) && !force) {
      // SAFE: Preserving existing user customization
      logger.warn(`${type} '${name}' is already installed`);
      return;
    }

    // Check dependencies using frontmatter parsing
    // Skip dependency checking if component is already installed to avoid path issues
    let component: ComponentMetadata | null = null;
    if (!alreadyInstalled) {
      const componentMetadata = await this.parseTemplateFrontmatter(componentPath);
      component = componentMetadata;
    } else {
      // For already installed components, try to read from installed location
      try {
        const componentMetadata = await this.parseTemplateFrontmatter(destPath);
        component = componentMetadata;
      } catch (error) {
        // If we can't read frontmatter from installed component, skip dependency checking
        logger.debug(`Could not parse frontmatter from installed component ${destPath}: ${error}`);
        component = null;
      }
    }

    if (this.typeRegistry.supportsDependencies(type) && component?.dependencies && component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!manifest.components.modes.includes(dep) || force) {
          logger.info(`Installing required dependency: mode '${dep}'`);
          await this.installComponent("mode", dep, force);
        }
      }
    }

    // Copy component file if it's not already installed or if we're forcing
    if (!alreadyInstalled || force) {
      const content = await this.fs.readFile(componentPath, "utf-8") as string;
      
      // WARNING: This writeFile will OVERWRITE any existing custom component if force=true
      await this.fs.writeFile(destPath, content);
    }

    // Reload manifest to get any updates from dependency installation
    manifest = await this.dirManager.getManifest();
    componentList = this.getManifestComponentList(manifest, type);
    
    // Ensure agents array exists in manifest if needed
    if (type === "agent" && !manifest.components.agents) {
      manifest.components.agents = [];
      componentList = manifest.components.agents;
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
    // Validate type using registry
    if (!this.typeRegistry.validateType(type)) {
      throw new Error(`Invalid component type: ${type}. Valid types: ${this.typeRegistry.getValidTypes().join(', ')}`);
    }

    const available = await this.listAvailableComponents();
    const pluralKey = type + 's' as keyof typeof available;
    const components = available[pluralKey] || [];

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
      `Run "zcc add ${type} <name>" to install a specific ${type}`
    );
  }


  /**
   * Get manifest component list for a given type
   */
  private getManifestComponentList(manifest: any, type: string): string[] {
    const pluralKey = type + 's';
    if (!manifest.components[pluralKey]) {
      manifest.components[pluralKey] = [];
    }
    return manifest.components[pluralKey];
  }

  /**
   * Map component type to destination directory type
   * This maintains backward compatibility with existing directory structure
   */
  private mapTypeToDestination(type: string): "modes" | "workflows" | "integrations" | "agents" {
    const mapping: Record<string, "modes" | "workflows" | "integrations" | "agents"> = {
      mode: "modes",
      workflow: "workflows",
      agent: "agents",
    };
    
    const dest = mapping[type];
    if (!dest) {
      throw new Error(`No destination mapping for component type: ${type}`);
    }
    return dest;
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
    for (const workflow of manifest.components.workflows) {
      // First try installed location, then template location
      const installedPath = this.dirManager.getComponentPath("workflows", workflow);
      const templatePath = this.fs.join(this.templatesDir, "workflows", `${workflow}.md`);
      const workflowPath = (await this.fs.exists(installedPath)) ? installedPath : templatePath;
      
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
      for (const agent of manifest.components.agents) {
        // First try installed location (.claude/agents), then template location
        const installedPath = this.fs.join(process.cwd(), '.claude', 'agents', `${agent}.md`);
        const templatePath = this.fs.join(this.templatesDir, "agents", `${agent}.md`);
        const agentPath = (await this.fs.exists(installedPath)) ? installedPath : templatePath;
        
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
