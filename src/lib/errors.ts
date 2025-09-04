/**
 * Custom error classes for better error handling and user experience
 */

export class ZccError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = "ZccError";
  }
}

export class FileSystemError extends ZccError {
  constructor(message: string, path: string, suggestion?: string) {
    super(
      message,
      "FS_ERROR",
      suggestion || `Check if you have write permissions for: ${path}`
    );
    this.name = "FileSystemError";
  }
}

export class ConfigurationError extends ZccError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      "CONFIG_ERROR",
      suggestion || 'Run "zcc config list" to view current configuration'
    );
    this.name = "ConfigurationError";
  }
}

export class ValidationError extends ZccError {
  constructor(message: string, field: string, suggestion?: string) {
    super(
      message,
      "VALIDATION_ERROR",
      suggestion || `Check the format of: ${field}`
    );
    this.name = "ValidationError";
  }
}

export class ComponentNotFoundError extends ZccError {
  constructor(componentType: string, componentName: string, availableComponents?: string[]) {
    const validTypesMsg = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'].includes(componentType)
      ? ''
      : ` Valid component types are: mode, workflow, agent, script, hook, command, template.`;
    
    const suggestion = availableComponents && availableComponents.length > 0
      ? `Available ${componentType}s: ${availableComponents.slice(0, 5).join(', ')}${availableComponents.length > 5 ? '...' : ''}.\nTry: zcc list --type ${componentType}`
      : `Try: zcc list --type ${componentType} to see available components`;

    super(
      `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} '${componentName}' not found.${validTypesMsg}`,
      "COMPONENT_NOT_FOUND",
      suggestion
    );
    this.name = "ComponentNotFoundError";
  }
}

export class InvalidComponentTypeError extends ZccError {
  constructor(providedType: string, validTypes: string[] = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template']) {
    super(
      `Invalid component type: '${providedType}'`,
      "INVALID_COMPONENT_TYPE",
      `Valid types are: ${validTypes.join(', ')}. Example: zcc add mode <name>`
    );
    this.name = "InvalidComponentTypeError";
  }
}

export class InvalidScopeError extends ZccError {
  constructor(providedScope: string, validScopes: string[] = ['builtin', 'global', 'project']) {
    super(
      `Invalid scope: '${providedScope}'`,
      "INVALID_SCOPE",
      `Valid scopes are: ${validScopes.join(', ')}. Example: zcc add mode <name> --source builtin`
    );
    this.name = "InvalidScopeError";
  }
}

export class TicketError extends ZccError {
  constructor(operation: string, ticketName: string, reason: string, suggestion?: string) {
    const defaultSuggestion = operation === 'create' && reason.includes('exists')
      ? `Ticket already exists. Try: zcc ticket list to see all tickets`
      : operation === 'move' && reason.includes('not found')
      ? `Try: zcc ticket list to see available tickets`
      : operation === 'move' && reason.includes('status')
      ? `Valid statuses are: next, in-progress, done`
      : `Try: zcc ticket list to see current tickets`;

    super(
      `Failed to ${operation} ticket '${ticketName}': ${reason}`,
      "TICKET_ERROR",
      suggestion || defaultSuggestion
    );
    this.name = "TicketError";
  }
}

export class ComponentInstallError extends ZccError {
  constructor(componentType: string, componentName: string, reason: string, suggestion?: string) {
    const defaultSuggestion = reason.includes('already exists')
      ? `Use --force to overwrite: zcc add ${componentType} ${componentName} --force`
      : reason.includes('permission')
      ? `Check file permissions or run with appropriate privileges`
      : `Try: zcc list --type ${componentType} to verify the component exists`;

    super(
      `Failed to install ${componentType} '${componentName}': ${reason}`,
      "COMPONENT_INSTALL_ERROR",
      suggestion || defaultSuggestion
    );
    this.name = "ComponentInstallError";
  }
}

export class PackError extends ZccError {
  constructor(packName: string, operation: string, reason: string, suggestion?: string) {
    const defaultSuggestion = operation === 'install' && reason.includes('not found')
      ? `Check available packs with: zcc list --type pack`
      : operation === 'install' && reason.includes('conflict')
      ? `Use --force to overwrite existing components`
      : operation === 'validate' && reason.includes('schema')
      ? `Check pack definition format and required fields`
      : `Try: zcc help for more information`;

    super(
      `Pack '${packName}' ${operation} failed: ${reason}`,
      "PACK_ERROR",
      suggestion || defaultSuggestion
    );
    this.name = "PackError";
  }
}

export class DependencyError extends ZccError {
  constructor(component: string, missingDependencies: string[]) {
    super(
      `Component '${component}' has missing dependencies: ${missingDependencies.join(', ')}`,
      "DEPENDENCY_ERROR",
      `Install missing dependencies first: ${missingDependencies.map(dep => `zcc add mode ${dep}`).join(', ')}`
    );
    this.name = "DependencyError";
  }
}

/**
 * User-friendly error handler that provides helpful messages
 */
export function handleError(error: unknown, verbose = false): void {
  if (error instanceof ZccError) {
    console.error(`\n✖ ${error.message}`);
    if (error.suggestion) {
      console.error(`\n💡 Suggestion: ${error.suggestion}`);
    }
    if (verbose) {
      console.error(`\nError code: ${error.code}`);
      console.error("Stack trace:", error.stack);
    }
  } else if (error instanceof Error) {
    console.error(`\n✖ Error: ${error.message}`);
    if (verbose) {
      console.error("Stack trace:", error.stack);
    } else {
      console.error("\n💡 Run with --verbose flag for more details");
    }
  } else {
    console.error("\n✖ An unexpected error occurred");
    if (verbose) {
      console.error("Details:", error);
    }
  }

  console.error(
    "\nFor help, visit: https://github.com/git-on-my-level/zcc/issues"
  );
  process.exit(1);
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  verbose = false
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, verbose);
    }
  }) as T;
}
