import matter from "gray-matter";
import { DirectoryManager } from "./directoryManager";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";
import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { ComponentNotFoundError, ComponentInstallError, InvalidComponentTypeError, DependencyError } from "./errors";
import { InputValidator } from "./validation/InputValidator";
import { withFileOperations, safeWriteFile } from "./utils/ResourceManager";

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
  private projectRoot: string;
  private dirManager: DirectoryManager;
  private templatesDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter, templatesDir?: string) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.dirManager = new DirectoryManager(projectRoot, this.fs);

    // Use provided templatesDir or fall back to centralized package path resolution
    this.templatesDir = templatesDir || PackagePaths.getTemplatesDir();
  }

  /**
   * Parse frontmatter from a template file
   */
  private async parseTemplateFrontmatter(filePath: string): Promise<ComponentMetadata | null> {
    return withFileOperations(async () => {
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
    });
  }

  /**
   * Scan a directory for template files and parse their metadata
   */
  private async scanComponentDirectory(dirPath: string, extension = ".md"): Promise<ComponentMetadata[]> {
    return withFileOperations(async () => {
      const components: ComponentMetadata[] = [];
      
      if (!(await this.fs.exists(dirPath))) {
        return components;
      }

      try {
        const files = await this.fs.readdir(dirPath);
        const templateFiles = files.filter(file => file.endsWith(extension));
        
        if (templateFiles.length > 0) {
          logger.progress(`Scanning ${templateFiles.length} template files`);
        }
        
        for (let i = 0; i < templateFiles.length; i++) {
          const file = templateFiles[i];
          const filePath = this.fs.join(dirPath, file);
          
          if (templateFiles.length > 1) {
            logger.step(i + 1, templateFiles.length, `Parsing ${file}`);
          }
          
          const metadata = await this.parseTemplateFrontmatter(filePath);
          
          if (metadata) {
            components.push(metadata);
          }
        }
        
        if (templateFiles.length > 0) {
          logger.clearProgress();
        }
      } catch (error) {
        logger.clearProgress();
        logger.warn(`Error scanning directory ${dirPath}: ${error}`);
      }
      
      return components;
    });
  }

  /**
   * List available components from templates using frontmatter parsing
   */
  async listAvailableComponents(): Promise<{
    modes: ComponentMetadata[];
    workflows: ComponentMetadata[];
    agents: ComponentMetadata[];
  }> {
    logger.progress('Scanning available components');
    
    const modesPath = this.fs.join(this.templatesDir, "modes");
    const workflowsPath = this.fs.join(this.templatesDir, "workflows");
    const agentsPath = this.fs.join(this.templatesDir, "agents");

    try {
      const [modes, workflows, agents] = await Promise.all([
        this.scanComponentDirectory(modesPath),
        this.scanComponentDirectory(workflowsPath),
        this.scanComponentDirectory(agentsPath),
      ]);

      logger.clearProgress();
      return { modes, workflows, agents };
    } catch (error) {
      logger.clearProgress();
      throw error;
    }
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
    // Validate and sanitize component name for security
    const validatedName = InputValidator.validateComponentName(name, type);
    
    // Check if component exists in templates
    let templateSubdir: string;
    if (type === "mode") {
      templateSubdir = "modes";
    } else if (type === "workflow") {
      templateSubdir = "workflows";
    } else if (type === "agent") {
      templateSubdir = "agents";
    } else {
      throw new InvalidComponentTypeError(type, ['mode', 'workflow', 'agent']);
    }
    
    // Validate template filename
    const fileName = `${validatedName}.md`;
    const validatedFileName = InputValidator.validateFileName(fileName, 'template filename');
    
    const componentPath = this.fs.join(
      this.templatesDir,
      templateSubdir,
      validatedFileName
    );

    if (!(await this.fs.exists(componentPath))) {
      const available = await this.listAvailableComponents();
      const availableOfType = type === 'mode' ? available.modes.map(m => m.name) 
        : type === 'workflow' ? available.workflows.map(w => w.name)
        : available.agents.map(a => a.name);
      
      throw new ComponentNotFoundError(type, validatedName, availableOfType);
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
      throw new InvalidComponentTypeError(type, ['mode', 'workflow', 'agent']);
    }

    if (componentList.includes(validatedName) && !force) {
      // SAFE: Preserving existing user customization
      throw new ComponentInstallError(
        type,
        validatedName,
        'component already exists',
        `Use --force to overwrite: memento add ${type} ${validatedName} --force`
      );
    }

    // Check dependencies using frontmatter parsing
    logger.progress(`Parsing component metadata for ${validatedName}`);
    const componentMetadata = await this.parseTemplateFrontmatter(componentPath);
    const component = componentMetadata;
    logger.clearProgress();

    if (component?.dependencies && component.dependencies.length > 0) {
      // Validate dependencies array for security
      const validatedDependencies = InputValidator.validateStringArray(
        component.dependencies, 
        'component dependencies', 
        20, // max 20 dependencies
        100 // max 100 chars per dependency name
      );
      
      // Check for missing dependencies first
      const missingDeps = validatedDependencies.filter(
        (dep) => !manifest.components.modes.includes(dep)
      );
      
      if (missingDeps.length > 0 && !force) {
        throw new DependencyError(`${type}:${validatedName}`, missingDeps);
      }
      
      logger.progress(`Installing ${component.dependencies.length} dependencies`);
      for (let i = 0; i < component.dependencies.length; i++) {
        const dep = component.dependencies[i];
        if (!manifest.components.modes.includes(dep) || force) {
          logger.step(i + 1, component.dependencies.length, `Installing dependency: ${dep}`);
          try {
            await this.installComponent("mode", dep, force);
          } catch (error) {
            logger.clearProgress();
            throw new ComponentInstallError(
              type,
              name,
              `failed to install dependency '${dep}': ${error}`,
              `Install dependency manually first: memento add mode ${dep}`
            );
          }
        }
      }
      logger.clearProgress();
    }

    // Copy component file with safe resource management
    logger.progress(`Installing ${type} ${validatedName}`);
    
    await withFileOperations(async () => {
      const content = await this.fs.readFile(componentPath, "utf-8") as string;
      
      // Validate template content for security before installation
      InputValidator.validateTemplateContent(content, `${type} ${validatedName}`);
      
      let destType: "modes" | "workflows" | "integrations" | "agents";
      if (type === "mode") {
        destType = "modes";
      } else if (type === "workflow") {
        destType = "workflows";
      } else if (type === "agent") {
        destType = "agents";
      } else {
        throw new InvalidComponentTypeError(type, ['mode', 'workflow', 'agent']);
      }
      
      const destPath = this.dirManager.getComponentPath(destType, validatedName);
      
      // Validate destination path for security - ensure it stays within project bounds
      try {
        InputValidator.validateFilePath(destPath, this.projectRoot, 'component destination path');
      } catch (pathError) {
        throw new ComponentInstallError(
          type,
          validatedName,
          `Destination path validation failed: ${pathError instanceof Error ? pathError.message : 'Invalid path'}`,
          'Component installation path is not safe'
        );
      }

      // WARNING: This writeFile will OVERWRITE any existing custom component if force=true
      // Use safeWriteFile for atomic operations with backup support
      await safeWriteFile(destPath, content, { backup: !force });
    });
    
    logger.clearProgress();

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
      throw new InvalidComponentTypeError(type, ['mode', 'workflow', 'agent']);
    }

    // Update manifest
    if (!componentList.includes(validatedName)) {
      componentList.push(validatedName);
    }
    manifest.components.updated = new Date().toISOString();
    await this.dirManager.updateManifest(manifest);

    if (force && componentList.includes(validatedName)) {
      logger.success(`Reinstalled ${type} '${validatedName}'`);
    } else {
      logger.success(`Installed ${type} '${validatedName}'`);
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
      throw new InvalidComponentTypeError(type, ['mode', 'workflow', 'agent']);
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
    return withFileOperations(async () => {
      const manifest = await this.dirManager.getManifest();
      const missing: { component: string; dependencies: string[] }[] = [];
      
      const totalComponents = manifest.components.workflows.length + (manifest.components.agents?.length || 0);
      
      if (totalComponents === 0) {
        return { valid: true, missing: [] };
      }
      
      logger.progress('Validating component dependencies');
      let processedCount = 0;

      try {
        // Check workflow dependencies
        const workflowsPath = this.fs.join(this.templatesDir, "workflows");
        for (const workflow of manifest.components.workflows) {
          processedCount++;
          logger.step(processedCount, totalComponents, `Validating workflow ${workflow}`);
          
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
            processedCount++;
            logger.step(processedCount, totalComponents, `Validating agent ${agent}`);
            
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
        
        logger.clearProgress();
        return {
          valid: missing.length === 0,
          missing,
        };
      } catch (error) {
        logger.clearProgress();
        throw error;
      }
    });
  }
}
