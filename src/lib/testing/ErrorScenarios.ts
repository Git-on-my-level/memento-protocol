/**
 * Comprehensive ErrorScenarios testing framework for Memento Protocol CLI
 * 
 * This framework provides standardized patterns for testing error scenarios across
 * the Memento Protocol codebase. It offers error injection, assertion utilities,
 * and common error scenario generators to ensure consistent error handling testing.
 * 
 * @example
 * ```typescript
 * import { ErrorScenarios } from '@/lib/testing/ErrorScenarios';
 * import { FileSystemError } from '@/lib/errors';
 * 
 * // Test specific error types
 * await ErrorScenarios.expectAsyncError(
 *   () => configManager.load('missing.yaml'),
 *   FileSystemError,
 *   'File not found'
 * );
 * 
 * // Simulate filesystem errors
 * ErrorScenarios.filesystem.simulatePermissionDenied(mockFs, '/protected');
 * 
 * // Test error recovery
 * await ErrorScenarios.testErrorRecovery(
 *   () => networkRequest(),
 *   () => fallbackRequest(),
 *   NetworkError
 * );
 * ```
 */

import { FileSystemError, ConfigurationError, ValidationError } from '../errors';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

/**
 * Error constructor type for type-safe error assertions
 */
type ErrorConstructor<T extends Error = Error> = new (...args: any[]) => T;

/**
 * Error scenario configuration
 */
export interface ErrorScenarioConfig {
  /** Should error recovery be attempted */
  allowRecovery?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to log error details during testing */
  verbose?: boolean;
}

/**
 * Error chain information for testing cascading failures
 */
export interface ErrorChain {
  error: Error;
  cause?: Error;
  context?: Record<string, unknown>;
}

/**
 * Network error simulation options
 */
export interface NetworkErrorOptions {
  timeout?: number;
  statusCode?: number;
  retryAfter?: number;
  message?: string;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetails {
  field: string;
  value: unknown;
  expectedType: string;
  constraints?: string[];
}

/**
 * Async operation that can be tested for errors
 */
type AsyncOperation<T = any> = () => Promise<T>;

/**
 * Sync operation that can be tested for errors
 */
type SyncOperation<T = any> = () => T;


/**
 * Main ErrorScenarios class providing comprehensive error testing utilities
 */
export class ErrorScenarios {
  private static readonly DEFAULT_CONFIG: ErrorScenarioConfig = {
    allowRecovery: false,
    maxRetries: 3,
    retryDelay: 100,
    verbose: false,
  };

  /**
   * Filesystem error simulation utilities
   */
  static readonly filesystem = {
    /**
     * Simulate a file not found error
     */
    simulateFileNotFound(fs: MemoryFileSystemAdapter, filePath: string): void {
      const originalRead = fs.readFile.bind(fs);
      fs.readFile = jest.fn().mockImplementation((path: string) => {
        if (path === filePath) {
          return Promise.reject(new FileSystemError(`File not found: ${path}`, path));
        }
        return originalRead(path);
      });
    },

    /**
     * Simulate permission denied error
     */
    simulatePermissionDenied(fs: MemoryFileSystemAdapter, path: string): void {
      const originalWrite = fs.writeFile.bind(fs);
      const originalMkdir = fs.mkdir.bind(fs);
      
      fs.writeFile = jest.fn().mockImplementation((filePath: string, content: string) => {
        if (filePath.startsWith(path)) {
          return Promise.reject(new FileSystemError(`Permission denied: ${filePath}`, filePath, 'Check file permissions'));
        }
        return originalWrite(filePath, content);
      });

      fs.mkdir = jest.fn().mockImplementation((dirPath: string) => {
        if (dirPath.startsWith(path)) {
          return Promise.reject(new FileSystemError(`Permission denied: ${dirPath}`, dirPath, 'Check directory permissions'));
        }
        return originalMkdir(dirPath);
      });
    },

    /**
     * Simulate disk full error
     */
    simulateDiskFull(fs: MemoryFileSystemAdapter): void {
      fs.writeFile = jest.fn().mockImplementation(() => {
        return Promise.reject(new FileSystemError('No space left on device', '/', 'Free up disk space'));
      });
    },

    /**
     * Simulate corrupted file content
     */
    simulateCorruptedFile(fs: MemoryFileSystemAdapter, filePath: string, corruptedContent: string = 'corrupted-data'): void {
      const originalRead = fs.readFile.bind(fs);
      fs.readFile = jest.fn().mockImplementation((path: string) => {
        if (path === filePath) {
          return Promise.resolve(corruptedContent);
        }
        return originalRead(path);
      });
    },

    /**
     * Simulate race condition in file operations
     */
    simulateRaceCondition(fs: MemoryFileSystemAdapter, filePath: string): void {
      let operationCount = 0;
      const originalWrite = fs.writeFile.bind(fs);
      
      fs.writeFile = jest.fn().mockImplementation((path: string, content: string) => {
        if (path === filePath) {
          operationCount++;
          if (operationCount % 2 === 0) {
            return Promise.reject(new FileSystemError(`Resource busy: ${path}`, path, 'Retry operation'));
          }
        }
        return originalWrite(path, content);
      });
    },

    /**
     * Create a filesystem error with specific details
     */
    createError(message: string, path: string, code: string = 'FS_ERROR'): FileSystemError {
      const error = new FileSystemError(message, path);
      error.code = code;
      return error;
    },
  };

  /**
   * Network error simulation utilities
   */
  static readonly network = {
    /**
     * Simulate network timeout
     */
    simulateTimeout(options: NetworkErrorOptions = {}): Promise<never> {
      const timeout = options.timeout || 5000;
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      });
    },

    /**
     * Simulate connection refused
     */
    simulateConnectionRefused(host: string = 'localhost', port: number = 80): Error {
      return new Error(`Connection refused to ${host}:${port}`);
    },

    /**
     * Simulate DNS failure
     */
    simulateDnsFailure(hostname: string): Error {
      return new Error(`DNS resolution failed for ${hostname}`);
    },

    /**
     * Simulate HTTP error
     */
    simulateHttpError(statusCode: number, message?: string): Error {
      const errorMessage = message || this.getHttpErrorMessage(statusCode);
      const error = new Error(`HTTP ${statusCode}: ${errorMessage}`);
      (error as any).statusCode = statusCode;
      return error;
    },

    /**
     * Simulate network intermittency
     */
    simulateIntermittentFailure<T>(
      operation: AsyncOperation<T>,
      failureRate: number = 0.5,
      errorMessage: string = 'Network error'
    ): AsyncOperation<T> {
      return async () => {
        if (Math.random() < failureRate) {
          throw new Error(errorMessage);
        }
        return operation();
      };
    },

    /**
     * Get standard HTTP error message for status code
     */
    getHttpErrorMessage(statusCode: number): string {
      const messages: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        408: 'Request Timeout',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
      };
      return messages[statusCode] || 'Unknown Error';
    },
  };

  /**
   * Validation error utilities
   */
  static readonly validation = {
    /**
     * Create validation error for missing field
     */
    createMissingFieldError(field: string, objectType: string = 'object'): ValidationError {
      return new ValidationError(`Missing required field: ${field}`, field, `Ensure ${field} is provided in ${objectType}`);
    },

    /**
     * Create validation error for invalid type
     */
    createInvalidTypeError(field: string, value: unknown, expectedType: string): ValidationError {
      const actualType = typeof value;
      return new ValidationError(
        `Invalid type for ${field}: expected ${expectedType}, got ${actualType}`,
        field,
        `Convert ${field} to ${expectedType}`
      );
    },

    /**
     * Create validation error for invalid format
     */
    createInvalidFormatError(field: string, value: unknown, format: string): ValidationError {
      return new ValidationError(
        `Invalid format for ${field}: expected ${format}, got "${value}"`,
        field,
        `Ensure ${field} matches ${format} format`
      );
    },

    /**
     * Create validation error for constraint violation
     */
    createConstraintError(field: string, value: unknown, constraints: string[]): ValidationError {
      return new ValidationError(
        `Constraint violation for ${field}: "${value}" violates: ${constraints.join(', ')}`,
        field,
        `Ensure ${field} meets constraints: ${constraints.join(', ')}`
      );
    },

    /**
     * Generate multiple validation errors for testing batch validation
     */
    createMultipleValidationErrors(details: ValidationErrorDetails[]): ValidationError[] {
      return details.map(detail => {
        if (detail.constraints) {
          return this.createConstraintError(detail.field, detail.value, detail.constraints);
        }
        return this.createInvalidTypeError(detail.field, detail.value, detail.expectedType);
      });
    },
  };

  /**
   * CLI error utilities
   */
  static readonly cli = {
    /**
     * Create missing argument error
     */
    createMissingArgumentError(argument: string, command: string): Error {
      return new Error(`Missing required argument: ${argument} for command: ${command}`);
    },

    /**
     * Create invalid option error
     */
    createInvalidOptionError(option: string, value: unknown, validValues?: string[]): Error {
      let message = `Invalid option value: ${option}="${value}"`;
      if (validValues) {
        message += `. Valid values: ${validValues.join(', ')}`;
      }
      return new Error(message);
    },

    /**
     * Create command not found error
     */
    createCommandNotFoundError(command: string, availableCommands?: string[]): Error {
      let message = `Command not found: ${command}`;
      if (availableCommands) {
        message += `. Available commands: ${availableCommands.join(', ')}`;
      }
      return new Error(message);
    },

    /**
     * Create configuration error
     */
    createConfigurationError(issue: string, suggestion?: string): ConfigurationError {
      return new ConfigurationError(issue, suggestion);
    },
  };

  /**
   * Configuration error utilities
   */
  static readonly config = {
    /**
     * Create invalid config file error
     */
    createInvalidConfigError(filePath: string, parseError?: string): ConfigurationError {
      let message = `Invalid configuration file: ${filePath}`;
      if (parseError) {
        message += `. Parse error: ${parseError}`;
      }
      return new ConfigurationError(message, 'Check configuration file syntax');
    },

    /**
     * Create config version mismatch error
     */
    createVersionMismatchError(currentVersion: string, requiredVersion: string): ConfigurationError {
      return new ConfigurationError(
        `Configuration version mismatch: current ${currentVersion}, required ${requiredVersion}`,
        'Update configuration to match required version'
      );
    },

    /**
     * Create missing config error
     */
    createMissingConfigError(configPath: string): ConfigurationError {
      return new ConfigurationError(
        `Configuration file not found: ${configPath}`,
        'Run "memento init" to create configuration'
      );
    },
  };

  /**
   * Dependency error utilities
   */
  static readonly dependency = {
    /**
     * Create missing dependency error
     */
    createMissingDependencyError(dependency: string, requiredBy?: string): Error {
      let message = `Missing dependency: ${dependency}`;
      if (requiredBy) {
        message += ` (required by ${requiredBy})`;
      }
      return new Error(message);
    },

    /**
     * Create circular dependency error
     */
    createCircularDependencyError(dependencyChain: string[]): Error {
      return new Error(`Circular dependency detected: ${dependencyChain.join(' -> ')}`);
    },

    /**
     * Create version conflict error
     */
    createVersionConflictError(dependency: string, requiredVersion: string, installedVersion: string): Error {
      return new Error(
        `Version conflict for ${dependency}: required ${requiredVersion}, installed ${installedVersion}`
      );
    },
  };

  /**
   * Assert that an async operation throws a specific error type
   */
  static async expectAsyncError<T extends Error>(
    operation: AsyncOperation,
    expectedErrorType?: ErrorConstructor<T>,
    expectedMessage?: string | RegExp,
    config: ErrorScenarioConfig = {}
  ): Promise<T> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    let operationSucceeded = false;
    let caughtError: Error;

    try {
      await operation();
      operationSucceeded = true;
    } catch (error) {
      caughtError = error as Error;
    }

    // If operation succeeded when it should have thrown
    if (operationSucceeded) {
      throw new Error('Expected operation to throw an error, but it succeeded');
    }

    if (mergedConfig.verbose) {
      console.log('Caught error:', caughtError!);
    }

    // Check error type if specified
    if (expectedErrorType && !(caughtError! instanceof expectedErrorType)) {
      throw new Error(
        `Expected error of type ${expectedErrorType.name}, but got ${caughtError!.constructor.name}: ${caughtError!.message}`
      );
    }

    // Check error message if specified
    if (expectedMessage) {
      const matches = typeof expectedMessage === 'string'
        ? caughtError!.message === expectedMessage
        : expectedMessage.test(caughtError!.message);
      
      if (!matches) {
        throw new Error(
          `Expected error message to ${typeof expectedMessage === 'string' ? 'equal' : 'match'} "${expectedMessage}", but got: "${caughtError!.message}"`
        );
      }
    }

    return caughtError! as T;
  }

  /**
   * Assert that a sync operation throws a specific error type
   */
  static expectSyncError<T extends Error>(
    operation: SyncOperation,
    expectedErrorType?: ErrorConstructor<T>,
    expectedMessage?: string | RegExp,
    config: ErrorScenarioConfig = {}
  ): T {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    let operationSucceeded = false;
    let caughtError: Error;

    try {
      operation();
      operationSucceeded = true;
    } catch (error) {
      caughtError = error as Error;
    }

    // If operation succeeded when it should have thrown
    if (operationSucceeded) {
      throw new Error('Expected operation to throw an error, but it succeeded');
    }

    if (mergedConfig.verbose) {
      console.log('Caught error:', caughtError!);
    }

    // Check error type if specified
    if (expectedErrorType && !(caughtError! instanceof expectedErrorType)) {
      throw new Error(
        `Expected error of type ${expectedErrorType.name}, but got ${caughtError!.constructor.name}: ${caughtError!.message}`
      );
    }

    // Check error message if specified
    if (expectedMessage) {
      const matches = typeof expectedMessage === 'string'
        ? caughtError!.message === expectedMessage
        : expectedMessage.test(caughtError!.message);
      
      if (!matches) {
        throw new Error(
          `Expected error message to ${typeof expectedMessage === 'string' ? 'equal' : 'match'} "${expectedMessage}", but got: "${caughtError!.message}"`
        );
      }
    }

    return caughtError! as T;
  }

  /**
   * Assert that an error chain has the expected structure
   */
  static expectErrorChain(error: Error, expectedChain: string[]): void {
    const chain: string[] = [];
    let current: Error | undefined = error;

    while (current) {
      chain.push(current.constructor.name);
      current = (current as any).cause;
    }

    expect(chain).toEqual(expectedChain);
  }

  /**
   * Assert that an error contains specific context information
   */
  static expectErrorContext(error: Error, expectedContext: Record<string, unknown>): void {
    const context = (error as any).context;
    if (!context) {
      throw new Error('Error does not contain context information');
    }

    for (const [key, value] of Object.entries(expectedContext)) {
      expect(context[key]).toEqual(value);
    }
  }

  /**
   * Inject errors into mock functions based on conditions
   */
  static injectError<TFunc extends (...args: any[]) => any>(
    mockFn: jest.MockedFunction<TFunc>,
    error: Error,
    condition?: (args: Parameters<TFunc>) => boolean
  ): jest.MockedFunction<TFunc> {
    const originalImplementation = mockFn.getMockImplementation();
    
    mockFn.mockImplementation(((...args: Parameters<TFunc>) => {
      if (!condition || condition(args)) {
        if (originalImplementation && originalImplementation.constructor.name === 'AsyncFunction') {
          return Promise.reject(error);
        }
        throw error;
      }
      
      if (originalImplementation) {
        return originalImplementation(...args);
      }
      
      return undefined as any;
    }) as TFunc);

    return mockFn;
  }

  /**
   * Test error recovery mechanisms
   */
  static async testErrorRecovery<T, E extends Error>(
    faultyOperation: AsyncOperation<T>,
    recoveryOperation: AsyncOperation<T>,
    expectedErrorType?: ErrorConstructor<E>,
    config: ErrorScenarioConfig = {}
  ): Promise<{ error: E; recoveredValue: T }> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    // First, ensure the operation fails as expected
    const error = await this.expectAsyncError(faultyOperation, expectedErrorType, undefined, mergedConfig);

    // Then test the recovery
    const recoveredValue = await recoveryOperation();

    return { error, recoveredValue };
  }

  /**
   * Test retry mechanisms
   */
  static async testRetryMechanism<T>(
    operation: AsyncOperation<T>,
    maxRetries: number = 3,
    expectedFailures: number = 2
  ): Promise<T> {
    let attempts = 0;
    let lastError: Error;

    const retryOperation = async (): Promise<T> => {
      attempts++;
      
      if (attempts <= expectedFailures) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      
      return operation();
    };

    // Simulate retry logic
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await retryOperation();
      } catch (error) {
        lastError = error as Error;
        if (i === maxRetries) {
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Test graceful degradation
   */
  static async testGracefulDegradation<T, F>(
    primaryOperation: AsyncOperation<T>,
    fallbackOperation: AsyncOperation<F>,
    expectedPrimaryError?: ErrorConstructor
  ): Promise<{ primaryFailed: true; fallbackValue: F } | { primaryFailed: false; primaryValue: T }> {
    try {
      const primaryValue = await primaryOperation();
      return { primaryFailed: false, primaryValue };
    } catch (error) {
      if (expectedPrimaryError && !(error instanceof expectedPrimaryError)) {
        throw error;
      }

      const fallbackValue = await fallbackOperation();
      return { primaryFailed: true, fallbackValue };
    }
  }

  /**
   * Test concurrent error scenarios
   */
  static async testConcurrentErrors<T>(
    operations: AsyncOperation<T>[],
    expectedErrorCount: number
  ): Promise<{ results: T[]; errors: Error[] }> {
    const promises = operations.map(op => 
      op().then(
        result => ({ success: true, result }),
        error => ({ success: false, error })
      )
    );

    const outcomes = await Promise.all(promises);
    
    const results: T[] = [];
    const errors: Error[] = [];

    outcomes.forEach(outcome => {
      if (outcome.success) {
        results.push((outcome as any).result);
      } else {
        errors.push((outcome as any).error);
      }
    });

    expect(errors).toHaveLength(expectedErrorCount);

    return { results, errors };
  }

  /**
   * Test partial failure in batch operations
   */
  static async testPartialFailure<T>(
    batchOperation: AsyncOperation<T[]>,
    expectedSuccessCount: number,
    expectedErrorCount: number
  ): Promise<{ successes: T[]; errors: Error[] }> {
    try {
      await batchOperation();
      throw new Error('Expected batch operation to have partial failures, but all succeeded');
    } catch (error) {
      // Expect the error to contain information about partial results
      const partialError = error as any;
      
      if (!partialError.successes || !partialError.errors) {
        throw new Error('Batch operation error should contain successes and errors arrays');
      }

      expect(partialError.successes).toHaveLength(expectedSuccessCount);
      expect(partialError.errors).toHaveLength(expectedErrorCount);

      return {
        successes: partialError.successes,
        errors: partialError.errors
      };
    }
  }

  /**
   * Create a cascading failure scenario
   */
  static async testCascadingFailure<T>(
    operations: AsyncOperation<T>[],
    triggerFailureAtIndex: number = 0
  ): Promise<Error[]> {
    const errors: Error[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        if (i >= triggerFailureAtIndex) {
          // Simulate that failures propagate
          throw new Error(`Operation ${i} failed due to cascade from operation ${triggerFailureAtIndex}`);
        }
        await operations[i]();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    return errors;
  }

  /**
   * Generate common error scenarios for comprehensive testing
   */
  static generateCommonScenarios(): {
    filesystem: Array<{ name: string; setup: (fs: MemoryFileSystemAdapter) => void; expectedError: ErrorConstructor }>;
    network: Array<{ name: string; operation: AsyncOperation<any>; expectedError: ErrorConstructor }>;
    validation: Array<{ name: string; data: any; expectedError: ErrorConstructor }>;
    configuration: Array<{ name: string; configData: any; expectedError: ErrorConstructor }>;
  } {
    return {
      filesystem: [
        {
          name: 'file_not_found',
          setup: (fs) => this.filesystem.simulateFileNotFound(fs, '/missing.txt'),
          expectedError: FileSystemError
        },
        {
          name: 'permission_denied',
          setup: (fs) => this.filesystem.simulatePermissionDenied(fs, '/protected'),
          expectedError: FileSystemError
        },
        {
          name: 'disk_full',
          setup: (fs) => this.filesystem.simulateDiskFull(fs),
          expectedError: FileSystemError
        }
      ],
      network: [
        {
          name: 'timeout',
          operation: () => this.network.simulateTimeout({ timeout: 1000 }),
          expectedError: Error
        },
        {
          name: 'connection_refused',
          operation: async () => { throw this.network.simulateConnectionRefused(); },
          expectedError: Error
        },
        {
          name: 'dns_failure',
          operation: async () => { throw this.network.simulateDnsFailure('invalid.domain'); },
          expectedError: Error
        }
      ],
      validation: [
        {
          name: 'missing_required_field',
          data: { /* missing name field */ },
          expectedError: ValidationError
        },
        {
          name: 'invalid_type',
          data: { name: 123 }, // should be string
          expectedError: ValidationError
        },
        {
          name: 'invalid_format',
          data: { email: 'not-an-email' },
          expectedError: ValidationError
        }
      ],
      configuration: [
        {
          name: 'invalid_config_format',
          configData: 'invalid-yaml: [unclosed',
          expectedError: ConfigurationError
        },
        {
          name: 'missing_required_config',
          configData: null,
          expectedError: ConfigurationError
        },
        {
          name: 'version_mismatch',
          configData: { version: '0.1.0' }, // too old
          expectedError: ConfigurationError
        }
      ]
    };
  }
}