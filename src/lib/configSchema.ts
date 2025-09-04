import { HookEvent } from './hooks/types';
import { ValidationError } from './errors';

/**
 * Interface for validation results
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Base validator interface
 */
export interface Validator {
  validate(value: unknown): ValidationResult;
  validatePartial?(value: unknown): ValidationResult;
}

/**
 * Schema for hook matcher (defined here to avoid circular imports)
 */
export interface HookMatcher {
  type: 'regex' | 'exact' | 'fuzzy' | 'tool' | 'keyword';
  pattern: string;
  confidence?: number;
}

/**
 * Schema for hook requirements (defined here to avoid circular imports)
 */
export interface HookRequirements {
  commands?: string[];
  env?: string[];
  files?: string[];
}

/**
 * Schema for hook configuration (defined here to avoid circular imports)
 */
export interface HookConfig {
  id: string;
  name: string;
  description?: string;
  event: HookEvent;
  enabled: boolean;
  matcher?: HookMatcher;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  continueOnError?: boolean;
  priority?: number;
  requirements?: HookRequirements;
}

/**
 * Schema for acronym configuration
 */
export interface AcronymConfig {
  version?: string;
  acronyms: Record<string, string>;
  settings: {
    caseSensitive: boolean;
    wholeWordOnly: boolean;
  };
}

/**
 * Unified ZCC configuration interface (replaces both ZccConfig and ZccScopeConfig)
 */
export interface ZccConfig {
  // Project-level settings
  defaultMode?: string;
  preferredWorkflows?: string[];
  customTemplateSources?: string[];
  
  // Integration settings
  integrations?: {
    [key: string]: any;
  };
  
  // UI preferences
  ui?: {
    colorOutput?: boolean;
    verboseLogging?: boolean;
  };
  
  // Component settings
  components?: {
    modes?: string[];
    workflows?: string[];
  };
}

/**
 * Utility functions for validation
 */
class ValidationUtils {
  static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
  }

  static isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  static isStringArray(value: unknown): value is string[] {
    return this.isArray(value) && value.every(item => this.isString(item));
  }

  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static isOptional<T>(validator: (val: unknown) => val is T) {
    return (value: unknown): value is T | undefined => {
      return value === undefined || validator(value);
    };
  }

  static isOneOf<T extends string>(values: readonly T[]) {
    return (value: unknown): value is T => {
      return this.isString(value) && values.includes(value as T);
    };
  }
}

/**
 * Validator for Hook Event types
 */
class HookEventValidator implements Validator {
  private validEvents: readonly HookEvent[] = [
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'SessionStart',
    'Stop',
    'SubagentStop',
    'PreCompact',
    'Notification'
  ];

  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isOneOf(this.validEvents)(value)) {
      result.valid = false;
      result.errors.push(`Invalid hook event. Must be one of: ${this.validEvents.join(', ')}`);
    }

    return result;
  }
}

/**
 * Validator for Hook Matcher
 */
class HookMatcherValidator implements Validator {
  private validTypes: readonly string[] = ['regex', 'exact', 'fuzzy', 'tool', 'keyword'];

  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isObject(value)) {
      result.valid = false;
      result.errors.push('Hook matcher must be an object');
      return result;
    }

    const matcher = value as Record<string, unknown>;

    // Validate type
    if (!ValidationUtils.isOneOf(this.validTypes)(matcher.type)) {
      result.valid = false;
      result.errors.push(`Invalid matcher type. Must be one of: ${this.validTypes.join(', ')}`);
    }

    // Validate pattern
    if (!ValidationUtils.isString(matcher.pattern)) {
      result.valid = false;
      result.errors.push('Matcher pattern must be a string');
    }

    // Validate confidence (optional)
    if (matcher.confidence !== undefined) {
      if (!ValidationUtils.isNumber(matcher.confidence)) {
        result.valid = false;
        result.errors.push('Matcher confidence must be a number');
      } else if (matcher.confidence < 0 || matcher.confidence > 1) {
        result.valid = false;
        result.errors.push('Matcher confidence must be between 0 and 1');
      }
    }

    return result;
  }
}

/**
 * Validator for Hook Requirements
 */
class HookRequirementsValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isObject(value)) {
      result.valid = false;
      result.errors.push('Hook requirements must be an object');
      return result;
    }

    const requirements = value as Record<string, unknown>;

    // Validate commands (optional array of strings)
    if (requirements.commands !== undefined) {
      if (!ValidationUtils.isStringArray(requirements.commands)) {
        result.valid = false;
        result.errors.push('Requirements.commands must be an array of strings');
      }
    }

    // Validate env (optional array of strings)
    if (requirements.env !== undefined) {
      if (!ValidationUtils.isStringArray(requirements.env)) {
        result.valid = false;
        result.errors.push('Requirements.env must be an array of strings');
      }
    }

    // Validate files (optional array of strings)
    if (requirements.files !== undefined) {
      if (!ValidationUtils.isStringArray(requirements.files)) {
        result.valid = false;
        result.errors.push('Requirements.files must be an array of strings');
      }
    }

    return result;
  }
}

/**
 * Validator for Hook Configuration
 */
export class HookConfigValidator implements Validator {
  private eventValidator = new HookEventValidator();
  private matcherValidator = new HookMatcherValidator();
  private requirementsValidator = new HookRequirementsValidator();

  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isObject(value)) {
      result.valid = false;
      result.errors.push('Hook configuration must be an object');
      return result;
    }

    const config = value as Record<string, unknown>;

    // Required fields
    if (!ValidationUtils.isString(config.id)) {
      result.valid = false;
      result.errors.push('Hook id is required and must be a string');
    }

    if (!ValidationUtils.isString(config.name)) {
      result.valid = false;
      result.errors.push('Hook name is required and must be a string');
    }

    if (!ValidationUtils.isString(config.command)) {
      result.valid = false;
      result.errors.push('Hook command is required and must be a string');
    }

    if (!ValidationUtils.isBoolean(config.enabled)) {
      result.valid = false;
      result.errors.push('Hook enabled is required and must be a boolean');
    }

    // Validate event
    const eventResult = this.eventValidator.validate(config.event);
    if (!eventResult.valid) {
      result.valid = false;
      result.errors.push(...eventResult.errors);
    }

    // Optional fields
    if (config.description !== undefined && !ValidationUtils.isString(config.description)) {
      result.valid = false;
      result.errors.push('Hook description must be a string');
    }

    if (config.matcher !== undefined) {
      const matcherResult = this.matcherValidator.validate(config.matcher);
      if (!matcherResult.valid) {
        result.valid = false;
        result.errors.push(...matcherResult.errors);
      }
    }

    if (config.args !== undefined && !ValidationUtils.isStringArray(config.args)) {
      result.valid = false;
      result.errors.push('Hook args must be an array of strings');
    }

    if (config.env !== undefined) {
      if (!ValidationUtils.isObject(config.env)) {
        result.valid = false;
        result.errors.push('Hook env must be an object');
      } else {
        const env = config.env as Record<string, unknown>;
        for (const [key, val] of Object.entries(env)) {
          if (!ValidationUtils.isString(val)) {
            result.valid = false;
            result.errors.push(`Hook env.${key} must be a string`);
          }
        }
      }
    }

    if (config.timeout !== undefined && !ValidationUtils.isNumber(config.timeout)) {
      result.valid = false;
      result.errors.push('Hook timeout must be a number');
    }

    if (config.continueOnError !== undefined && !ValidationUtils.isBoolean(config.continueOnError)) {
      result.valid = false;
      result.errors.push('Hook continueOnError must be a boolean');
    }

    if (config.priority !== undefined && !ValidationUtils.isNumber(config.priority)) {
      result.valid = false;
      result.errors.push('Hook priority must be a number');
    }

    if (config.requirements !== undefined) {
      const requirementsResult = this.requirementsValidator.validate(config.requirements);
      if (!requirementsResult.valid) {
        result.valid = false;
        result.errors.push(...requirementsResult.errors);
      }
    }

    return result;
  }
}

/**
 * Validator for Acronym Configuration
 */
export class AcronymConfigValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isObject(value)) {
      result.valid = false;
      result.errors.push('Acronym configuration must be an object');
      return result;
    }

    const config = value as Record<string, unknown>;

    // Validate version (optional)
    if (config.version !== undefined && !ValidationUtils.isString(config.version)) {
      result.valid = false;
      result.errors.push('Acronym config version must be a string');
    }

    // Validate acronyms (required)
    if (!ValidationUtils.isObject(config.acronyms)) {
      result.valid = false;
      result.errors.push('Acronyms must be an object');
    } else {
      const acronyms = config.acronyms as Record<string, unknown>;
      for (const [key, val] of Object.entries(acronyms)) {
        if (!ValidationUtils.isString(val)) {
          result.valid = false;
          result.errors.push(`Acronym value for "${key}" must be a string`);
        }
      }
    }

    // Validate settings (required)
    if (!ValidationUtils.isObject(config.settings)) {
      result.valid = false;
      result.errors.push('Acronym settings must be an object');
    } else {
      const settings = config.settings as Record<string, unknown>;
      
      if (!ValidationUtils.isBoolean(settings.caseSensitive)) {
        result.valid = false;
        result.errors.push('Settings.caseSensitive must be a boolean');
      }

      if (!ValidationUtils.isBoolean(settings.wholeWordOnly)) {
        result.valid = false;
        result.errors.push('Settings.wholeWordOnly must be a boolean');
      }
    }

    return result;
  }
}

/**
 * Validator for Main ZCC Configuration
 */
export class ZccConfigValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!ValidationUtils.isObject(value)) {
      result.valid = false;
      result.errors.push('Configuration must be an object');
      return result;
    }

    const config = value as Record<string, unknown>;

    // Validate defaultMode (optional)
    if (config.defaultMode !== undefined && !ValidationUtils.isString(config.defaultMode)) {
      result.valid = false;
      result.errors.push('Default mode must be a string');
    }

    // Validate preferredWorkflows (optional)
    if (config.preferredWorkflows !== undefined && !ValidationUtils.isStringArray(config.preferredWorkflows)) {
      result.valid = false;
      result.errors.push('Preferred workflows must be an array of strings');
    }

    // Validate customTemplateSources (optional)
    if (config.customTemplateSources !== undefined && !ValidationUtils.isStringArray(config.customTemplateSources)) {
      result.valid = false;
      result.errors.push('Custom template sources must be an array of strings');
    }

    // Validate integrations (optional)
    if (config.integrations !== undefined && !ValidationUtils.isObject(config.integrations)) {
      result.valid = false;
      result.errors.push('Integrations must be an object');
    }

    // Validate UI settings (optional)
    if (config.ui !== undefined) {
      if (!ValidationUtils.isObject(config.ui)) {
        result.valid = false;
        result.errors.push('UI settings must be an object');
      } else {
        const ui = config.ui as Record<string, unknown>;
        
        if (ui.colorOutput !== undefined && !ValidationUtils.isBoolean(ui.colorOutput)) {
          result.valid = false;
          result.errors.push('UI.colorOutput must be a boolean');
        }

        if (ui.verboseLogging !== undefined && !ValidationUtils.isBoolean(ui.verboseLogging)) {
          result.valid = false;
          result.errors.push('UI.verboseLogging must be a boolean');
        }
      }
    }

    // Validate components (optional)
    if (config.components !== undefined) {
      if (!ValidationUtils.isObject(config.components)) {
        result.valid = false;
        result.errors.push('Components must be an object');
      } else {
        const components = config.components as Record<string, unknown>;
        
        if (components.modes !== undefined && !ValidationUtils.isStringArray(components.modes)) {
          result.valid = false;
          result.errors.push('Components.modes must be an array of strings');
        }

        if (components.workflows !== undefined && !ValidationUtils.isStringArray(components.workflows)) {
          result.valid = false;
          result.errors.push('Components.workflows must be an array of strings');
        }
      }
    }

    return result;
  }

  validatePartial(value: unknown): ValidationResult {
    // For partial validation, we only validate the fields that are present
    // This is useful for configuration updates where not all fields are provided
    return this.validate(value);
  }
}

/**
 * Schema registry that provides access to all validators
 */
export class ConfigSchemaRegistry {
  private static instance: ConfigSchemaRegistry;
  
  private zccConfigValidator = new ZccConfigValidator();
  private hookConfigValidator = new HookConfigValidator();
  private acronymConfigValidator = new AcronymConfigValidator();

  static getInstance(): ConfigSchemaRegistry {
    if (!ConfigSchemaRegistry.instance) {
      ConfigSchemaRegistry.instance = new ConfigSchemaRegistry();
    }
    return ConfigSchemaRegistry.instance;
  }

  getZccConfigValidator(): ZccConfigValidator {
    return this.zccConfigValidator;
  }

  getHookConfigValidator(): HookConfigValidator {
    return this.hookConfigValidator;
  }

  getAcronymConfigValidator(): AcronymConfigValidator {
    return this.acronymConfigValidator;
  }

  /**
   * Validate a configuration object and throw ValidationError if invalid
   */
  validateAndThrow(validator: Validator, value: unknown, context: string): void {
    const result = validator.validate(value);
    if (!result.valid) {
      throw new ValidationError(
        `${context} validation failed: ${result.errors.join(', ')}`,
        context
      );
    }
  }
}