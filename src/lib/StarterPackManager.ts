import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import Ajv from "ajv";
import { logger } from "./logger";
import { PackagePaths } from "./packagePaths";
import { ComponentInstaller } from "./componentInstaller";
// TODO: Phase 2 - import DirectoryManager for actual installation
// import { DirectoryManager } from "./directoryManager";
import { MementoError, ValidationError } from "./errors";
import {
  StarterPack,
  PackInstallOptions,
  PackValidationResult,
  PackDependencyResult,
  PackInstallResult,
} from "./types/starterPacks";

/**
 * StarterPackManager handles loading, validating, and installing starter packs
 * Starter packs are curated bundles of modes, workflows, and agents that work together
 */
export class StarterPackManager {
  private starterPacksDir: string;
  private schemaPath: string;
  private ajv: Ajv;
  private schema: any;
  private componentInstaller: ComponentInstaller;
  // TODO: Phase 2 - these will be used for actual installation
  // private projectRoot: string;
  // private dirManager: DirectoryManager;

  constructor(projectRoot: string) {
    // TODO: Phase 2 - store these for actual installation
    // this.projectRoot = projectRoot;
    // this.dirManager = new DirectoryManager(projectRoot);
    
    this.starterPacksDir = path.join(PackagePaths.getTemplatesDir(), "starter-packs");
    this.schemaPath = path.join(this.starterPacksDir, "schema.json");
    this.ajv = new Ajv({ allErrors: true });
    this.componentInstaller = new ComponentInstaller(projectRoot);
  }

  /**
   * Initialize the manager by loading the JSON schema
   */
  private async ensureInitialized(): Promise<void> {
    if (this.schema) {
      return;
    }

    if (!existsSync(this.schemaPath)) {
      throw new MementoError(
        "Starter pack schema not found",
        "SCHEMA_MISSING",
        "Ensure Memento Protocol is properly installed"
      );
    }

    try {
      const schemaContent = await fs.readFile(this.schemaPath, "utf-8");
      this.schema = JSON.parse(schemaContent);
      this.ajv.addSchema(this.schema, "starterPack");
    } catch (error) {
      throw new MementoError(
        "Failed to load starter pack schema",
        "SCHEMA_LOAD_ERROR",
        "Check if the schema file is valid JSON"
      );
    }
  }

  /**
   * List available starter packs from the templates directory
   */
  async listPacks(): Promise<StarterPack[]> {
    await this.ensureInitialized();

    if (!existsSync(this.starterPacksDir)) {
      logger.debug("Starter packs directory does not exist");
      return [];
    }

    const packs: StarterPack[] = [];

    try {
      const files = await fs.readdir(this.starterPacksDir);
      
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'schema.json') {
          try {
            const pack = await this.loadPack(path.basename(file, '.json'));
            packs.push(pack);
          } catch (error) {
            logger.warn(`Failed to load starter pack ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      logger.warn(`Error reading starter packs directory: ${error}`);
    }

    return packs;
  }

  /**
   * Load a specific starter pack by name
   */
  async loadPack(name: string): Promise<StarterPack> {
    await this.ensureInitialized();

    const packPath = path.join(this.starterPacksDir, `${name}.json`);
    
    if (!existsSync(packPath)) {
      throw new MementoError(
        `Starter pack '${name}' not found`,
        "PACK_NOT_FOUND",
        `Available packs: ${(await this.listPacks()).map(p => p.name).join(', ') || 'none'}`
      );
    }

    try {
      const packContent = await fs.readFile(packPath, "utf-8");
      const packData = JSON.parse(packContent);

      // Validate against schema
      const validation = await this.validatePack(packData);
      if (!validation.valid) {
        throw new ValidationError(
          `Invalid starter pack '${name}': ${validation.errors.join(', ')}`,
          "starterPack",
          "Check the pack definition against the schema"
        );
      }

      return packData as StarterPack;
    } catch (error) {
      if (error instanceof MementoError) {
        throw error;
      }
      throw new MementoError(
        `Failed to load starter pack '${name}': ${error}`,
        "PACK_LOAD_ERROR",
        "Check if the pack file is valid JSON"
      );
    }
  }

  /**
   * Validate a starter pack definition against the schema
   */
  async validatePack(pack: any): Promise<PackValidationResult> {
    await this.ensureInitialized();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    const isValid = this.ajv.validate("starterPack", pack);
    if (!isValid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        const message = `${error.instancePath || 'root'} ${error.message}`;
        errors.push(message);
      }
    }

    // Additional business logic validation
    if (pack.components) {
      await this.validateComponents(pack.components, errors, warnings);
    }

    if (pack.dependencies) {
      await this.validateDependencies(pack.dependencies, pack.name, errors, warnings);
    }

    if (pack.mementoProtocolVersion) {
      this.validateVersionCompatibility(pack.mementoProtocolVersion, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that referenced components exist
   */
  private async validateComponents(
    components: any,
    errors: string[],
    _warnings: string[]
  ): Promise<void> {
    const availableComponents = await this.componentInstaller.listAvailableComponents();

    // Check modes
    if (components.modes) {
      for (const modeComponent of components.modes) {
        const found = availableComponents.modes.find(m => m.name === modeComponent.name);
        if (!found) {
          errors.push(`Referenced mode '${modeComponent.name}' not found in templates`);
        }
      }
    }

    // Check workflows
    if (components.workflows) {
      for (const workflowComponent of components.workflows) {
        const found = availableComponents.workflows.find(w => w.name === workflowComponent.name);
        if (!found) {
          errors.push(`Referenced workflow '${workflowComponent.name}' not found in templates`);
        }
      }
    }

    // Check agents
    if (components.agents) {
      for (const agentComponent of components.agents) {
        const found = availableComponents.agents.find(a => a.name === agentComponent.name);
        if (!found) {
          errors.push(`Referenced agent '${agentComponent.name}' not found in templates`);
        }
      }
    }
  }

  /**
   * Validate pack dependencies
   */
  private async validateDependencies(
    dependencies: string[],
    currentPackName: string,
    errors: string[],
    _warnings: string[]
  ): Promise<void> {
    const availablePacks = await this.listPacks();
    const availablePackNames = availablePacks.map(p => p.name);

    for (const dep of dependencies) {
      if (!availablePackNames.includes(dep)) {
        errors.push(`Dependency '${dep}' not found`);
      }
      
      if (dep === currentPackName) {
        errors.push("Pack cannot depend on itself");
      }
    }
  }

  /**
   * Validate version compatibility
   */
  private validateVersionCompatibility(
    requiredVersion: string,
    errors: string[],
    _warnings: string[]
  ): void {
    // For now, just validate the format
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(requiredVersion)) {
      errors.push(`Invalid version format: ${requiredVersion}`);
    }

    // TODO: Add actual version comparison when we have package version available
    // This would compare against the current Memento Protocol version
  }

  /**
   * Resolve dependencies for a starter pack
   * Returns the installation order and detects circular dependencies
   */
  async resolveDependencies(pack: StarterPack): Promise<PackDependencyResult> {
    const resolved: string[] = [];
    const missing: string[] = [];
    const circular: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const availablePacks = await this.listPacks();
    const packMap = new Map(availablePacks.map(p => [p.name, p]));

    const visit = async (packName: string): Promise<void> => {
      if (visited.has(packName)) {
        return;
      }

      if (visiting.has(packName)) {
        circular.push(packName);
        return;
      }

      const currentPack = packMap.get(packName);
      if (!currentPack) {
        missing.push(packName);
        return;
      }

      visiting.add(packName);

      // Visit dependencies first
      if (currentPack.dependencies) {
        for (const dep of currentPack.dependencies) {
          await visit(dep);
        }
      }

      visiting.delete(packName);
      visited.add(packName);
      resolved.push(packName);
    };

    // Start with the pack's dependencies
    if (pack.dependencies) {
      for (const dep of pack.dependencies) {
        await visit(dep);
      }
    }

    return {
      resolved,
      missing,
      circular,
    };
  }

  /**
   * Install a starter pack (stub implementation for Phase 1)
   * This method provides the interface but doesn't perform actual installation yet
   */
  async installPack(
    pack: StarterPack,
    _options: PackInstallOptions = {}
  ): Promise<PackInstallResult> {
    logger.info(`Installing starter pack '${pack.name}'`);

    // Validate the pack first
    const validation = await this.validatePack(pack);
    if (!validation.valid) {
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [] },
        skipped: { modes: [], workflows: [], agents: [] },
        errors: validation.errors,
      };
    }

    // Check dependencies
    const dependencies = await this.resolveDependencies(pack);
    if (dependencies.missing.length > 0 || dependencies.circular.length > 0) {
      const errors = [
        ...dependencies.missing.map(dep => `Dependency '${dep}' not found`),
        ...dependencies.circular.map(dep => `Circular dependency: ${dep}`),
      ];
      
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [] },
        skipped: { modes: [], workflows: [], agents: [] },
        errors,
      };
    }

    // For Phase 1, just return a stub result
    // Phase 2 will implement the actual installation logic
    logger.info("Starter pack validation passed - actual installation coming in Phase 2");

    return {
      success: true,
      installed: {
        modes: pack.components.modes?.map(m => m.name) || [],
        workflows: pack.components.workflows?.map(w => w.name) || [],
        agents: pack.components.agents?.map(a => a.name) || [],
      },
      skipped: { modes: [], workflows: [], agents: [] },
      errors: [],
      postInstallMessage: pack.postInstall?.message,
    };
  }
}