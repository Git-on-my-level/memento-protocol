import * as path from 'path';
import { ValidationError } from '../errors';

/**
 * Security-focused input validation to prevent injection attacks, path traversal,
 * and other security vulnerabilities throughout the Memento Protocol codebase.
 */
export class InputValidator {
  // Dangerous patterns that could indicate injection attempts or path traversal
  private static readonly DANGEROUS_PATTERNS = [
    /\.\.\//g,              // Directory traversal
    /\.\.\\+/g,             // Windows directory traversal
    /__proto__/gi,          // Prototype pollution
    /constructor/gi,        // Constructor pollution
    /process\./gi,          // Process manipulation
    /require\(/gi,          // Node.js require injection
    /import\(/gi,           // ES6 import injection
    /eval\(/gi,             // Code evaluation
    /Function\(/gi,         // Function constructor
    /\$\{.*\}/g,            // Template literal injection
    /`.*\$/g,               // Command injection via backticks
    /<script/gi,            // XSS attempts
    /javascript:/gi,        // JavaScript protocol
    /vbscript:/gi,          // VBScript protocol
    /data:/gi,              // Data URLs (potential XSS)
    /\x00/g,                // Null bytes
    /[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, // Control characters
  ];

  // Safe characters for component names (alphanumeric, hyphens, underscores, dots)
  private static readonly COMPONENT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  
  // Maximum lengths to prevent buffer overflow attempts
  private static readonly MAX_COMPONENT_NAME_LENGTH = 100;
  private static readonly MAX_TICKET_NAME_LENGTH = 150;
  private static readonly MAX_PATH_LENGTH = 1000;
  private static readonly MAX_CONFIG_VALUE_LENGTH = 10000;
  private static readonly MAX_TEMPLATE_CONTENT_LENGTH = 1000000; // 1MB

  // Reserved system names that should not be used
  private static readonly RESERVED_NAMES = new Set([
    'con', 'prn', 'aux', 'nul', // Windows reserved
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
    '..', '.', // Directory references
    'system', 'root', 'admin', 'administrator', // System accounts
    'node_modules', '.git', '.env', 'package.json', // Common dev files
  ]);

  /**
   * Validate component names (modes, workflows, agents, etc.)
   * Components must be safe for use in file paths and identifiers
   */
  static validateComponentName(name: string, componentType = 'component'): string {
    if (!name || typeof name !== 'string') {
      throw new ValidationError(
        `${componentType} name is required and must be a string`,
        'componentName',
        `Provide a valid ${componentType} name using letters, numbers, hyphens, and underscores`
      );
    }

    // Check length
    if (name.length === 0) {
      throw new ValidationError(
        `${componentType} name cannot be empty`,
        'componentName',
        `Provide a ${componentType} name (e.g., "my-${componentType}")`
      );
    }

    if (name.length > this.MAX_COMPONENT_NAME_LENGTH) {
      throw new ValidationError(
        `${componentType} name is too long (${name.length} chars, max ${this.MAX_COMPONENT_NAME_LENGTH})`,
        'componentName',
        `Use a shorter ${componentType} name (max ${this.MAX_COMPONENT_NAME_LENGTH} characters)`
      );
    }

    // Check for dangerous patterns
    this.checkDangerousPatterns(name, `${componentType} name`);

    // Check format
    if (!this.COMPONENT_NAME_PATTERN.test(name)) {
      throw new ValidationError(
        `${componentType} name contains invalid characters: "${name}"`,
        'componentName',
        `${componentType} names can only contain letters, numbers, hyphens, underscores, and dots. Must start with a letter or number.`
      );
    }

    // Check for reserved names
    if (this.RESERVED_NAMES.has(name.toLowerCase())) {
      throw new ValidationError(
        `"${name}" is a reserved ${componentType} name and cannot be used`,
        'componentName',
        `Choose a different ${componentType} name (e.g., "my-${name}", "${name}-mode")`
      );
    }

    // Check for suspicious patterns
    if (name.includes('--')) {
      throw new ValidationError(
        `${componentType} name cannot contain consecutive hyphens: "${name}"`,
        'componentName',
        'Replace consecutive hyphens with single hyphens'
      );
    }

    if (name.includes('..')) {
      throw new ValidationError(
        `${componentType} name cannot contain consecutive dots: "${name}"`,
        'componentName',
        'Replace consecutive dots with single dots or hyphens'
      );
    }

    return name.trim().toLowerCase();
  }

  /**
   * Validate and sanitize file paths to prevent directory traversal
   * Ensures paths stay within project boundaries
   */
  static sanitizePath(inputPath: string, baseDir?: string, description = 'path'): string {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new ValidationError(
        `${description} is required and must be a string`,
        'filePath',
        `Provide a valid ${description}`
      );
    }

    // Check length
    if (inputPath.length > this.MAX_PATH_LENGTH) {
      throw new ValidationError(
        `${description} is too long (${inputPath.length} chars, max ${this.MAX_PATH_LENGTH})`,
        'filePath',
        `Use a shorter ${description} (max ${this.MAX_PATH_LENGTH} characters)`
      );
    }

    // Check for dangerous patterns
    this.checkDangerousPatterns(inputPath, description);

    // Normalize and resolve the path
    let cleanPath: string;
    try {
      cleanPath = path.normalize(inputPath);
      
      // Additional check after normalization
      if (cleanPath.includes('..')) {
        throw new ValidationError(
          `${description} contains directory traversal: "${inputPath}"`,
          'filePath',
          `Use relative paths within the project directory`
        );
      }
    } catch (error: any) {
      throw new ValidationError(
        `Invalid ${description}: ${error.message}`,
        'filePath',
        `Use a valid file path format`
      );
    }

    // If a base directory is provided, ensure the path stays within it
    if (baseDir) {
      try {
        const resolvedBase = path.resolve(baseDir);
        const resolvedPath = path.resolve(baseDir, cleanPath);
        
        if (!resolvedPath.startsWith(resolvedBase)) {
          throw new ValidationError(
            `${description} escapes project boundary: "${inputPath}"`,
            'filePath',
            `Use paths within the project directory`
          );
        }
      } catch (error: any) {
        throw new ValidationError(
          `Failed to validate ${description} boundaries: ${error.message}`,
          'filePath',
          'Use a simpler path relative to the project root'
        );
      }
    }

    // Block absolute paths when relative is expected
    if (path.isAbsolute(cleanPath) && !baseDir) {
      throw new ValidationError(
        `${description} should be relative, not absolute: "${inputPath}"`,
        'filePath',
        'Use a relative path instead of an absolute path'
      );
    }

    return cleanPath;
  }

  /**
   * Validate ticket names with same rules as component names but different length limit
   */
  static validateTicketName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new ValidationError(
        'Ticket name is required and must be a string',
        'ticketName',
        'Provide a ticket name using letters, numbers, hyphens, and underscores'
      );
    }

    if (name.length > this.MAX_TICKET_NAME_LENGTH) {
      throw new ValidationError(
        `Ticket name is too long (${name.length} chars, max ${this.MAX_TICKET_NAME_LENGTH})`,
        'ticketName',
        `Use a shorter ticket name (max ${this.MAX_TICKET_NAME_LENGTH} characters)`
      );
    }

    // Use component name validation logic
    const sanitized = this.validateComponentName(name, 'ticket');
    
    // Additional ticket-specific validation
    if (name.startsWith('-') || name.endsWith('-')) {
      throw new ValidationError(
        `Ticket name cannot start or end with hyphens: "${name}"`,
        'ticketName',
        'Remove hyphens from the beginning or end of the ticket name'
      );
    }

    return sanitized;
  }

  /**
   * Validate file paths to ensure they don't escape project boundaries
   */
  static validateFilePath(filePath: string, projectRoot: string, description = 'file path'): string {
    return this.sanitizePath(filePath, projectRoot, description);
  }

  /**
   * Validate configuration values to prevent injection
   */
  static validateConfigValue(key: string, value: any, maxLength = this.MAX_CONFIG_VALUE_LENGTH): any {
    if (!key || typeof key !== 'string') {
      throw new ValidationError(
        'Configuration key is required and must be a string',
        'configKey',
        'Provide a valid configuration key name'
      );
    }

    // Validate key name
    this.checkDangerousPatterns(key, 'configuration key');

    // Handle different value types
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      if (value.length > maxLength) {
        throw new ValidationError(
          `Configuration value for "${key}" is too long (${value.length} chars, max ${maxLength})`,
          'configValue',
          `Use a shorter value for "${key}" (max ${maxLength} characters)`
        );
      }

      // Check for dangerous patterns in string values
      this.checkDangerousPatterns(value, `configuration value for "${key}"`);
      
      return value;
    }

    if (typeof value === 'object') {
      try {
        const serialized = JSON.stringify(value);
        if (serialized.length > maxLength) {
          throw new ValidationError(
            `Configuration object for "${key}" is too large when serialized`,
            'configValue',
            `Simplify the configuration object for "${key}"`
          );
        }

        // Check for dangerous patterns in serialized object
        this.checkDangerousPatterns(serialized, `configuration object for "${key}"`);
      } catch (error: any) {
        throw new ValidationError(
          `Configuration value for "${key}" cannot be serialized: ${error.message}`,
          'configValue',
          `Use a simpler configuration value for "${key}"`
        );
      }
    }

    return value;
  }

  /**
   * Validate template content for security issues
   */
  static validateTemplateContent(content: string, templateName = 'template'): string {
    if (!content || typeof content !== 'string') {
      throw new ValidationError(
        `${templateName} content is required and must be a string`,
        'templateContent',
        `Provide valid ${templateName} content`
      );
    }

    if (content.length > this.MAX_TEMPLATE_CONTENT_LENGTH) {
      throw new ValidationError(
        `${templateName} content is too large (${content.length} chars, max ${this.MAX_TEMPLATE_CONTENT_LENGTH})`,
        'templateContent',
        `Reduce the size of ${templateName} content (max ${this.MAX_TEMPLATE_CONTENT_LENGTH} characters)`
      );
    }

    // Check for dangerous patterns but be more lenient for legitimate template content
    const suspiciousPatterns = [
      /\.\.\//g,              // Directory traversal
      /__proto__/gi,          // Prototype pollution
      /process\./gi,          // Process manipulation
      /require\(/gi,          // Node.js require injection
      /eval\(/gi,             // Code evaluation
      /\x00/g,                // Null bytes
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new ValidationError(
          `${templateName} content contains potentially dangerous patterns`,
          'templateContent',
          `Review ${templateName} content for security issues and remove suspicious code`
        );
      }
    }

    return content;
  }

  /**
   * Validate that a string contains only safe filename characters
   */
  static validateFileName(fileName: string, description = 'filename'): string {
    if (!fileName || typeof fileName !== 'string') {
      throw new ValidationError(
        `${description} is required and must be a string`,
        'fileName',
        `Provide a valid ${description}`
      );
    }

    // Check for dangerous patterns
    this.checkDangerousPatterns(fileName, description);

    // Check for invalid filename characters
    const invalidChars = /[<>:"|?*\x00-\x1f\x80-\x9f]/g;
    if (invalidChars.test(fileName)) {
      throw new ValidationError(
        `${description} contains invalid characters: "${fileName}"`,
        'fileName',
        `Remove special characters from ${description}. Use letters, numbers, hyphens, and underscores.`
      );
    }

    // Check for reserved names
    const nameWithoutExt = path.parse(fileName).name.toLowerCase();
    if (this.RESERVED_NAMES.has(nameWithoutExt)) {
      throw new ValidationError(
        `"${fileName}" uses a reserved system name`,
        'fileName',
        `Choose a different ${description} (e.g., "my-${nameWithoutExt}")`
      );
    }

    return fileName.trim();
  }

  /**
   * Check for dangerous patterns that could indicate injection attempts
   */
  private static checkDangerousPatterns(input: string, description: string): void {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        throw new ValidationError(
          `${description} contains potentially dangerous content: "${input}"`,
          'security',
          `Remove suspicious patterns from ${description}. Use only safe characters and avoid special symbols.`
        );
      }
    }
  }

  /**
   * Validate user input for interactive prompts
   */
  static validateUserInput(input: string, type: 'componentName' | 'ticketName' | 'fileName' | 'path', maxLength = 200): string {
    if (!input || typeof input !== 'string') {
      throw new ValidationError(
        `${type} is required`,
        type,
        `Provide a valid ${type}`
      );
    }

    const trimmed = input.trim();
    
    if (trimmed.length === 0) {
      throw new ValidationError(
        `${type} cannot be empty`,
        type,
        `Provide a non-empty ${type}`
      );
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(
        `${type} is too long (${trimmed.length} chars, max ${maxLength})`,
        type,
        `Use a shorter ${type} (max ${maxLength} characters)`
      );
    }

    // Apply specific validation based on type
    switch (type) {
      case 'componentName':
        return this.validateComponentName(trimmed);
      case 'ticketName':
        return this.validateTicketName(trimmed);
      case 'fileName':
        return this.validateFileName(trimmed);
      case 'path':
        return this.sanitizePath(trimmed);
      default:
        this.checkDangerousPatterns(trimmed, type);
        return trimmed;
    }
  }

  /**
   * Validate array of strings (useful for tags, dependencies, etc.)
   */
  static validateStringArray(arr: any, fieldName: string, maxItems = 50, maxItemLength = 100): string[] {
    if (!Array.isArray(arr)) {
      throw new ValidationError(
        `${fieldName} must be an array`,
        fieldName,
        `Provide ${fieldName} as an array of strings`
      );
    }

    if (arr.length > maxItems) {
      throw new ValidationError(
        `${fieldName} has too many items (${arr.length}, max ${maxItems})`,
        fieldName,
        `Reduce the number of items in ${fieldName} (max ${maxItems})`
      );
    }

    const validatedItems: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item !== 'string') {
        throw new ValidationError(
          `${fieldName}[${i}] must be a string`,
          fieldName,
          `All items in ${fieldName} must be strings`
        );
      }

      if (item.length > maxItemLength) {
        throw new ValidationError(
          `${fieldName}[${i}] is too long (${item.length} chars, max ${maxItemLength})`,
          fieldName,
          `Use shorter strings in ${fieldName} (max ${maxItemLength} chars each)`
        );
      }

      this.checkDangerousPatterns(item, `${fieldName}[${i}]`);
      validatedItems.push(item.trim());
    }

    return validatedItems;
  }
}