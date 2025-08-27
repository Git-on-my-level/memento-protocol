/**
 * Custom error classes for better error handling and user experience
 */

export class MementoError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = "MementoError";
  }
}

export class FileSystemError extends MementoError {
  constructor(message: string, path: string, suggestion?: string) {
    super(
      message,
      "FS_ERROR",
      suggestion || `Check if you have write permissions for: ${path}`
    );
    this.name = "FileSystemError";
  }
}

export class ConfigurationError extends MementoError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      "CONFIG_ERROR",
      suggestion || 'Run "memento config" to view current configuration'
    );
    this.name = "ConfigurationError";
  }
}

export class ValidationError extends MementoError {
  constructor(message: string, field: string, suggestion?: string) {
    super(
      message,
      "VALIDATION_ERROR",
      suggestion || `Check the format of: ${field}`
    );
    this.name = "ValidationError";
  }
}

/**
 * User-friendly error handler that provides helpful messages
 */
export function handleError(error: unknown, verbose = false): void {
  if (error instanceof MementoError) {
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
    "\nFor help, visit: https://github.com/git-on-my-level/memento-protocol/issues"
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
