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

export class InvalidScopeError extends ZccError {
  constructor(providedScope: string, validScopes: string[] = ['builtin', 'global', 'project']) {
    super(
      `Invalid scope: '${providedScope}'`,
      "INVALID_SCOPE",
      `Valid scopes are: ${validScopes.join(', ')}`
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

export class PackError extends ZccError {
  constructor(packName: string, operation: string, reason: string, suggestion?: string) {
    const defaultSuggestion = operation === 'install' && reason.includes('not found')
      ? `Check available packs with: zcc pack list`
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
