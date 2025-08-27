/**
 * PackValidator handles validation and security checks for starter packs
 */

import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import Ajv from "ajv";
import {
  PackManifest,
  PackStructure,
  PackValidationResult,
} from "../types/packs";
import { logger } from "../logger";
import { MementoError } from "../errors";
import { PackagePaths } from "../packagePaths";
import { IPackSource } from "./PackSource";

/**
 * Security and validation rules for pack validation
 */
interface ValidationRules {
  maxNameLength: number;
  maxDescriptionLength: number;
  maxComponentsPerType: number;
  allowedFileExtensions: Set<string>;
  forbiddenPaths: Set<string>;
  maxFileSize: number; // in bytes
}

export class PackValidator {
  private ajv: Ajv;
  private schema: unknown;
  private rules: ValidationRules;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: true });
    this.rules = {
      maxNameLength: 50,
      maxDescriptionLength: 500,
      maxComponentsPerType: 20,
      allowedFileExtensions: new Set(['.md', '.json', '.sh']),
      forbiddenPaths: new Set([
        '..', '../', '~', '/etc', '/usr', '/var', '/root',
        'C:\\Windows', 'C:\\Program Files'
      ]),
      maxFileSize: 1024 * 1024, // 1MB max per file
    };
  }

  /**
   * Initialize validator by loading the pack schema
   */
  async initialize(): Promise<void> {
    if (this.schema) {
      return;
    }

    const schemaPath = path.join(PackagePaths.getTemplatesDir(), "starter-packs", "schema.json");
    
    if (!existsSync(schemaPath)) {
      throw new MementoError(
        "Pack validation schema not found",
        "SCHEMA_MISSING",
        "Ensure Memento Protocol is properly installed"
      );
    }

    try {
      const schemaContent = await fs.readFile(schemaPath, "utf-8");
      this.schema = JSON.parse(schemaContent);
      this.ajv.addSchema(this.schema as any, "packManifest");
      
      logger.debug("Pack validator initialized with schema");
    } catch (error) {
      throw new MementoError(
        "Failed to load pack validation schema",
        "SCHEMA_LOAD_ERROR",
        `Schema error: ${error}`
      );
    }
  }

  /**
   * Validate a pack manifest against schema and security rules
   */
  async validateManifest(manifest: PackManifest): Promise<PackValidationResult> {
    await this.initialize();

    const errors: string[] = [];
    const warnings: string[] = []; // TODO: Implement warning collection

    // JSON Schema validation
    await this.validateSchema(manifest, errors);

    // Security validation
    await this.validateSecurity(manifest, errors, warnings);

    // Business logic validation
    await this.validateBusinessRules(manifest, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a complete pack structure including components
   */
  async validatePackStructure(
    packStructure: PackStructure,
    source: IPackSource
  ): Promise<PackValidationResult> {
    const manifestResult = await this.validateManifest(packStructure.manifest);
    
    if (!manifestResult.valid) {
      return manifestResult;
    }

    const errors = [...manifestResult.errors];
    const warnings = [...manifestResult.warnings];

    // Validate components exist and are safe
    await this.validateComponents(packStructure, source, errors, warnings);

    // Validate file structure security
    await this.validateFileStructure(packStructure, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate manifest against JSON schema
   */
  private async validateSchema(manifest: PackManifest, errors: string[]): Promise<void> {
    const isValid = this.ajv.validate("packManifest", manifest);
    
    if (!isValid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        const path = error.instancePath || 'root';
        const message = `${path} ${error.message}`;
        errors.push(message);
      }
    }
  }

  /**
   * Validate security constraints
   */
  private async validateSecurity(
    manifest: PackManifest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check name security
    if (manifest.name.length > this.rules.maxNameLength) {
      errors.push(`Pack name too long (max ${this.rules.maxNameLength} characters)`);
    }

    if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      errors.push("Pack name must contain only lowercase letters, numbers, and hyphens");
    }

    // Check for forbidden patterns
    for (const forbiddenPath of this.rules.forbiddenPaths) {
      if (manifest.name.includes(forbiddenPath)) {
        errors.push(`Pack name contains forbidden pattern: ${forbiddenPath}`);
      }
    }

    // Validate description
    if (manifest.description.length > this.rules.maxDescriptionLength) {
      errors.push(`Description too long (max ${this.rules.maxDescriptionLength} characters)`);
    }

    // Check post-install commands for security
    if (manifest.postInstall?.commands) {
      for (const command of manifest.postInstall.commands) {
        if (this.isCommandSuspicious(command)) {
          errors.push(`Suspicious post-install command detected: ${command}`);
        }
      }
    }

    // Validate custom command templates
    if (manifest.configuration?.customCommands) {
      for (const [name, command] of Object.entries(manifest.configuration.customCommands)) {
        if (this.isCommandSuspicious(command.template)) {
          warnings.push(`Custom command '${name}' template may be suspicious: ${command.template}`);
        }
      }
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    manifest: PackManifest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const components = manifest.components;

    // Check component limits
    if (components.modes && components.modes.length > this.rules.maxComponentsPerType) {
      errors.push(`Too many modes (max ${this.rules.maxComponentsPerType})`);
    }

    if (components.workflows && components.workflows.length > this.rules.maxComponentsPerType) {
      errors.push(`Too many workflows (max ${this.rules.maxComponentsPerType})`);
    }

    if (components.agents && components.agents.length > this.rules.maxComponentsPerType) {
      errors.push(`Too many agents (max ${this.rules.maxComponentsPerType})`);
    }

    // Check for duplicate component names
    const allComponentNames = new Set<string>();
    
    for (const componentType of ['modes', 'workflows', 'agents', 'hooks'] as const) {
      const componentList = components[componentType];
      if (componentList) {
        for (const component of componentList) {
          if (allComponentNames.has(component.name)) {
            errors.push(`Duplicate component name: ${component.name}`);
          }
          allComponentNames.add(component.name);
        }
      }
    }

    // Validate default mode exists if specified
    if (manifest.configuration?.defaultMode) {
      const modeExists = components.modes?.some(m => m.name === manifest.configuration?.defaultMode);
      if (!modeExists) {
        errors.push(`Default mode '${manifest.configuration.defaultMode}' not found in pack modes`);
      }
    }

    // Check required components are marked appropriately
    const hasRequiredMode = components.modes?.some(m => m.required === true);
    if (!hasRequiredMode && components.modes && components.modes.length > 0) {
      warnings.push("Pack has modes but none are marked as required");
    }
  }

  /**
   * Validate component files exist and are safe
   */
  private async validateComponents(
    packStructure: PackStructure,
    _source: IPackSource,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const { manifest } = packStructure;
    const componentTypes = ['modes', 'workflows', 'agents', 'hooks'] as const;

    for (const componentType of componentTypes) {
      const components = manifest.components[componentType];
      if (!components) continue;

      for (const component of components) {
        try {
          // TODO: Implement hasComponent method on IPackSource
          const hasComponent = true; // await source.hasComponent(manifest.name, componentType, component.name);

          if (!hasComponent) {
            errors.push(
              `Component '${component.name}' of type '${componentType}' not found in pack`
            );
          } else {
            // Validate component file
            // TODO: Implement getComponentPath method on IPackSource
            const componentPath = ""; // await source.getComponentPath(manifest.name, componentType, component.name);
            
            await this.validateComponentFile(componentPath, errors, warnings);
          }
        } catch (error) {
          errors.push(`Error validating component '${component.name}': ${error}`);
        }
      }
    }
  }

  /**
   * Validate individual component files
   */
  private async validateComponentFile(
    filePath: string,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size > this.rules.maxFileSize) {
        errors.push(`Component file too large: ${path.basename(filePath)} (${stats.size} bytes)`);
      }

      // Check file extension
      const ext = path.extname(filePath);
      if (!this.rules.allowedFileExtensions.has(ext)) {
        errors.push(`Forbidden file extension: ${ext} in ${path.basename(filePath)}`);
      }

      // Basic content validation for markdown files
      if (ext === '.md') {
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (content.includes('<script>') || content.includes('javascript:')) {
          errors.push(`Suspicious content detected in ${path.basename(filePath)}`);
        }

        if (content.length === 0) {
          warnings.push(`Empty component file: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      errors.push(`Cannot validate component file ${path.basename(filePath)}: ${error}`);
    }
  }

  /**
   * Validate pack file structure security
   */
  private async validateFileStructure(
    packStructure: PackStructure,
    errors: string[],
    _warnings: string[]
  ): Promise<void> {
    try {
      // Check that pack path is reasonable
      const packPath = path.resolve(packStructure.path);
      
      for (const forbiddenPath of this.rules.forbiddenPaths) {
        if (packPath.includes(forbiddenPath)) {
          errors.push(`Pack path contains forbidden pattern: ${forbiddenPath}`);
        }
      }

      // Ensure components path is within pack path
      const componentsPath = path.resolve(packStructure.componentsPath);
      if (!componentsPath.startsWith(packPath)) {
        errors.push("Components directory is outside pack directory");
      }

    } catch (error) {
      errors.push(`Error validating pack file structure: ${error}`);
    }
  }

  /**
   * Check if a command looks suspicious
   */
  private isCommandSuspicious(command: string): boolean {
    const suspiciousPatterns = [
      /rm\s+-rf\s*\//, // dangerous rm commands
      /sudo\s+/, // sudo usage
      /chmod\s+777/, // overly permissive permissions
      /curl\s+.*\|\s*sh/, // pipe to shell
      /wget\s+.*\|\s*sh/, // pipe to shell
      /eval\s+/, // eval usage
      /exec\s+/, // exec usage
      /system\s*\(/, // system calls
      /`.*`/, // backticks (command substitution)
      /\$\(.*\)/, // command substitution
      />\/dev\/null.*2>&1.*&/, // background processes
      /nohup\s+/, // background processes
      /&\s*$/, // background processes
    ];

    return suspiciousPatterns.some(pattern => pattern.test(command));
  }
}