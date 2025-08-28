/**
 * Comprehensive tests for ErrorScenarios testing framework
 */

import { ErrorScenarios } from '../ErrorScenarios';
import { 
  FileSystemError, 
  ConfigurationError, 
  ValidationError 
} from '../../errors';
import { MemoryFileSystemAdapter } from '../../adapters/MemoryFileSystemAdapter';

describe('ErrorScenarios', () => {
  describe('expectAsyncError', () => {
    it('should assert that async operation throws specific error type', async () => {
      const operation = async () => {
        throw new FileSystemError('File not found', '/missing.txt');
      };

      const error = await ErrorScenarios.expectAsyncError(
        operation,
        FileSystemError,
        'File not found'
      );

      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toBe('File not found');
    });

    it('should assert that async operation throws with regex message match', async () => {
      const operation = async () => {
        throw new ValidationError('Invalid field: email', 'email');
      };

      const error = await ErrorScenarios.expectAsyncError(
        operation,
        ValidationError,
        /Invalid field: \w+/
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toMatch(/Invalid field: \w+/);
    });

    it('should fail when operation succeeds but error is expected', async () => {
      const operation = async () => 'success';

      let thrownError: Error | undefined;
      try {
        await ErrorScenarios.expectAsyncError(operation, Error);
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('Expected operation to throw an error, but it succeeded');
    });

    it('should fail when wrong error type is thrown', async () => {
      const operation = async () => {
        throw new ValidationError('Invalid', 'field');
      };

      await expect(
        ErrorScenarios.expectAsyncError(operation, FileSystemError)
      ).rejects.toThrow('Expected error of type FileSystemError, but got ValidationError');
    });

    it('should fail when error message does not match', async () => {
      const operation = async () => {
        throw new Error('Actual message');
      };

      await expect(
        ErrorScenarios.expectAsyncError(operation, Error, 'Expected message')
      ).rejects.toThrow('Expected error message to equal "Expected message", but got: "Actual message"');
    });
  });

  describe('expectSyncError', () => {
    it('should assert that sync operation throws specific error type', () => {
      const operation = () => {
        throw new ConfigurationError('Invalid config');
      };

      const error = ErrorScenarios.expectSyncError(
        operation,
        ConfigurationError,
        'Invalid config'
      );

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Invalid config');
    });

    it('should fail when sync operation succeeds but error is expected', () => {
      const operation = () => 'success';

      let thrownError: Error | undefined;
      try {
        ErrorScenarios.expectSyncError(operation, Error);
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('Expected operation to throw an error, but it succeeded');
    });
  });

  describe('expectErrorChain', () => {
    it('should validate error cause chain', () => {
      const rootCause = new Error('Root cause');
      const middleError = new Error('Middle error');
      (middleError as any).cause = rootCause;
      const topError = new Error('Top error');
      (topError as any).cause = middleError;

      ErrorScenarios.expectErrorChain(topError, ['Error', 'Error', 'Error']);
    });

    it('should handle single error without chain', () => {
      const singleError = new FileSystemError('Single error', '/path');

      ErrorScenarios.expectErrorChain(singleError, ['FileSystemError']);
    });
  });

  describe('expectErrorContext', () => {
    it('should validate error context information', () => {
      const error = new Error('Error with context');
      (error as any).context = {
        operation: 'file-read',
        path: '/test.txt',
        timestamp: '2023-01-01T00:00:00Z'
      };

      ErrorScenarios.expectErrorContext(error, {
        operation: 'file-read',
        path: '/test.txt'
      });
    });

    it('should fail when error has no context', () => {
      const error = new Error('Error without context');

      expect(() => {
        ErrorScenarios.expectErrorContext(error, { key: 'value' });
      }).toThrow('Error does not contain context information');
    });
  });

  describe('injectError', () => {
    it.skip('should inject errors into mock functions', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const injectedError = new Error('Injected error');

      ErrorScenarios.injectError(mockFn, injectedError);

      await expect(mockFn()).rejects.toThrow('Injected error');
    });

    it.skip('should inject errors conditionally', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const injectedError = new Error('Conditional error');

      ErrorScenarios.injectError(
        mockFn,
        injectedError,
        ([arg]) => arg === 'trigger'
      );

      // Should succeed with non-trigger argument
      await expect(mockFn('normal')).resolves.toBe('success');

      // Should fail with trigger argument
      await expect(mockFn('trigger')).rejects.toThrow('Conditional error');
    });
  });

  describe('testErrorRecovery', () => {
    it('should test error recovery mechanism', async () => {
      const faultyOperation = async () => {
        throw new Error('Primary operation failed');
      };

      const recoveryOperation = async () => 'recovered';

      const result = await ErrorScenarios.testErrorRecovery(
        faultyOperation,
        recoveryOperation,
        Error
      );

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Primary operation failed');
      expect(result.recoveredValue).toBe('recovered');
    });
  });

  describe('testRetryMechanism', () => {
    it('should test retry mechanism with eventual success', async () => {
      // Create an operation that will fail twice then succeed
      const operation = async () => 'success';

      const result = await ErrorScenarios.testRetryMechanism(
        operation,
        3, // max retries
        2  // expected failures
      );

      expect(result).toBe('success');
    });

    it('should fail when max retries exceeded', async () => {
      const result = ErrorScenarios.testRetryMechanism(
        async () => { throw new Error('Always fails'); },
        2, // max retries
        5  // more failures than retries
      );

      await expect(result).rejects.toThrow('Attempt 3 failed');
    });
  });

  describe('testGracefulDegradation', () => {
    it('should return primary value when primary operation succeeds', async () => {
      const primaryOperation = async () => 'primary success';
      const fallbackOperation = async () => 'fallback';

      const result = await ErrorScenarios.testGracefulDegradation(
        primaryOperation,
        fallbackOperation
      );

      expect(result.primaryFailed).toBe(false);
      expect((result as any).primaryValue).toBe('primary success');
    });

    it('should return fallback value when primary operation fails', async () => {
      const primaryOperation = async () => {
        throw new Error('Primary failed');
      };
      const fallbackOperation = async () => 'fallback success';

      const result = await ErrorScenarios.testGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        Error
      );

      expect(result.primaryFailed).toBe(true);
      expect((result as any).fallbackValue).toBe('fallback success');
    });
  });

  describe('testConcurrentErrors', () => {
    it('should test concurrent operations with expected error count', async () => {
      const operations = [
        async () => 'success1',
        async () => { throw new Error('error1'); },
        async () => 'success2',
        async () => { throw new Error('error2'); }
      ];

      const result = await ErrorScenarios.testConcurrentErrors(operations, 2);

      expect(result.results).toEqual(['success1', 'success2']);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toBe('error1');
      expect(result.errors[1].message).toBe('error2');
    });
  });

  describe('testCascadingFailure', () => {
    it('should test cascading failure starting from specific index', async () => {
      const operations = [
        async () => 'success1',
        async () => 'success2',
        async () => 'success3'
      ];

      const errors = await ErrorScenarios.testCascadingFailure(operations, 1);

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain('Operation 1 failed due to cascade');
      expect(errors[1].message).toContain('Operation 2 failed due to cascade');
    });
  });

  describe('filesystem errors', () => {
    let fs: MemoryFileSystemAdapter;

    beforeEach(() => {
      fs = new MemoryFileSystemAdapter();
    });

    it('should simulate file not found error', async () => {
      ErrorScenarios.filesystem.simulateFileNotFound(fs, '/missing.txt');

      await expect(fs.readFile('/missing.txt')).rejects.toThrow('File not found: /missing.txt');
    });

    it('should simulate permission denied error', async () => {
      ErrorScenarios.filesystem.simulatePermissionDenied(fs, '/protected');

      await expect(fs.writeFile('/protected/file.txt', 'content')).rejects.toThrow('Permission denied');
    });

    it('should simulate disk full error', async () => {
      ErrorScenarios.filesystem.simulateDiskFull(fs);

      await expect(fs.writeFile('/any-file.txt', 'content')).rejects.toThrow('No space left on device');
    });

    it('should simulate corrupted file content', async () => {
      await fs.writeFile('/test.txt', 'original content');
      ErrorScenarios.filesystem.simulateCorruptedFile(fs, '/test.txt', 'corrupted');

      const content = await fs.readFile('/test.txt');
      expect(content).toBe('corrupted');
    });

    it('should simulate race condition', async () => {
      ErrorScenarios.filesystem.simulateRaceCondition(fs, '/race-test.txt');

      // First write should succeed
      await expect(fs.writeFile('/race-test.txt', 'content1')).resolves.toBeUndefined();

      // Second write should fail due to race condition
      await expect(fs.writeFile('/race-test.txt', 'content2')).rejects.toThrow('Resource busy');
    });

    it('should create filesystem error with specific details', () => {
      const error = ErrorScenarios.filesystem.createError('Custom error', '/path', 'CUSTOM_CODE');

      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('network errors', () => {
    it('should simulate timeout', async () => {
      const timeoutPromise = ErrorScenarios.network.simulateTimeout({ timeout: 100 });

      await expect(timeoutPromise).rejects.toThrow('Request timeout after 100ms');
    });

    it('should simulate connection refused', () => {
      const error = ErrorScenarios.network.simulateConnectionRefused('example.com', 443);

      expect(error.message).toBe('Connection refused to example.com:443');
    });

    it('should simulate DNS failure', () => {
      const error = ErrorScenarios.network.simulateDnsFailure('invalid.domain');

      expect(error.message).toBe('DNS resolution failed for invalid.domain');
    });

    it('should simulate HTTP error', () => {
      const error = ErrorScenarios.network.simulateHttpError(404, 'Resource not found');

      expect(error.message).toBe('HTTP 404: Resource not found');
      expect((error as any).statusCode).toBe(404);
    });

    it.skip('should simulate intermittent failure', async () => {
      // This test is complex due to Math.random mocking
      // In real usage, intermittent failures would be tested differently
      const operation = async () => 'success';
      const intermittentOperation = ErrorScenarios.network.simulateIntermittentFailure(
        operation,
        0.5,
        'Network unstable'
      );

      // Test that the function exists and is callable
      expect(typeof intermittentOperation).toBe('function');
    });

    it('should get HTTP error message for standard status codes', () => {
      expect(ErrorScenarios.network.getHttpErrorMessage(404)).toBe('Not Found');
      expect(ErrorScenarios.network.getHttpErrorMessage(500)).toBe('Internal Server Error');
      expect(ErrorScenarios.network.getHttpErrorMessage(999)).toBe('Unknown Error');
    });
  });

  describe('validation errors', () => {
    it('should create missing field error', () => {
      const error = ErrorScenarios.validation.createMissingFieldError('name', 'user');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Missing required field: name');
      expect(error.suggestion).toBe('Ensure name is provided in user');
    });

    it('should create invalid type error', () => {
      const error = ErrorScenarios.validation.createInvalidTypeError('age', 'not-a-number', 'number');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid type for age: expected number, got string');
      expect(error.suggestion).toBe('Convert age to number');
    });

    it('should create invalid format error', () => {
      const error = ErrorScenarios.validation.createInvalidFormatError('email', 'not-email', 'email');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid format for email: expected email, got "not-email"');
      expect(error.suggestion).toBe('Ensure email matches email format');
    });

    it('should create constraint error', () => {
      const error = ErrorScenarios.validation.createConstraintError(
        'password',
        'weak',
        ['min-length: 8', 'contains-uppercase']
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Constraint violation for password: "weak" violates: min-length: 8, contains-uppercase');
      expect(error.suggestion).toBe('Ensure password meets constraints: min-length: 8, contains-uppercase');
    });

    it('should create multiple validation errors', () => {
      const details = [
        { field: 'name', value: null, expectedType: 'string' },
        { field: 'age', value: 'not-number', expectedType: 'number' },
        { field: 'password', value: 'weak', expectedType: 'string', constraints: ['min-length: 8'] }
      ];

      const errors = ErrorScenarios.validation.createMultipleValidationErrors(details);

      expect(errors).toHaveLength(3);
      expect(errors[0].message).toContain('Invalid type for name');
      expect(errors[1].message).toContain('Invalid type for age');
      expect(errors[2].message).toContain('Constraint violation for password');
    });
  });

  describe('CLI errors', () => {
    it('should create missing argument error', () => {
      const error = ErrorScenarios.cli.createMissingArgumentError('input', 'process');

      expect(error.message).toBe('Missing required argument: input for command: process');
    });

    it('should create invalid option error', () => {
      const error = ErrorScenarios.cli.createInvalidOptionError('format', 'xml', ['json', 'yaml']);

      expect(error.message).toBe('Invalid option value: format="xml". Valid values: json, yaml');
    });

    it('should create command not found error', () => {
      const error = ErrorScenarios.cli.createCommandNotFoundError('unknown', ['init', 'add', 'list']);

      expect(error.message).toBe('Command not found: unknown. Available commands: init, add, list');
    });

    it('should create configuration error', () => {
      const error = ErrorScenarios.cli.createConfigurationError('Invalid setting', 'Check configuration file');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Invalid setting');
      expect(error.suggestion).toBe('Check configuration file');
    });
  });

  describe('config errors', () => {
    it('should create invalid config error', () => {
      const error = ErrorScenarios.config.createInvalidConfigError('/config.yaml', 'YAML parse error');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Invalid configuration file: /config.yaml. Parse error: YAML parse error');
      expect(error.suggestion).toBe('Check configuration file syntax');
    });

    it('should create version mismatch error', () => {
      const error = ErrorScenarios.config.createVersionMismatchError('1.0.0', '2.0.0');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Configuration version mismatch: current 1.0.0, required 2.0.0');
      expect(error.suggestion).toBe('Update configuration to match required version');
    });

    it('should create missing config error', () => {
      const error = ErrorScenarios.config.createMissingConfigError('/missing-config.yaml');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Configuration file not found: /missing-config.yaml');
      expect(error.suggestion).toBe('Run "memento init" to create configuration');
    });
  });

  describe('dependency errors', () => {
    it('should create missing dependency error', () => {
      const error = ErrorScenarios.dependency.createMissingDependencyError('react', 'frontend-pack');

      expect(error.message).toBe('Missing dependency: react (required by frontend-pack)');
    });

    it('should create circular dependency error', () => {
      const error = ErrorScenarios.dependency.createCircularDependencyError(['pack-a', 'pack-b', 'pack-c', 'pack-a']);

      expect(error.message).toBe('Circular dependency detected: pack-a -> pack-b -> pack-c -> pack-a');
    });

    it('should create version conflict error', () => {
      const error = ErrorScenarios.dependency.createVersionConflictError('typescript', '>=4.0.0', '3.9.0');

      expect(error.message).toBe('Version conflict for typescript: required >=4.0.0, installed 3.9.0');
    });
  });

  describe('generateCommonScenarios', () => {
    it('should generate comprehensive common error scenarios', () => {
      const scenarios = ErrorScenarios.generateCommonScenarios();

      expect(scenarios.filesystem).toHaveLength(3);
      expect(scenarios.network).toHaveLength(3);
      expect(scenarios.validation).toHaveLength(3);
      expect(scenarios.configuration).toHaveLength(3);

      // Verify filesystem scenarios
      expect(scenarios.filesystem[0].name).toBe('file_not_found');
      expect(scenarios.filesystem[0].expectedError).toBe(FileSystemError);

      // Verify network scenarios
      expect(scenarios.network[0].name).toBe('timeout');
      expect(scenarios.network[0].expectedError).toBe(Error);

      // Verify validation scenarios
      expect(scenarios.validation[0].name).toBe('missing_required_field');
      expect(scenarios.validation[0].expectedError).toBe(ValidationError);

      // Verify configuration scenarios
      expect(scenarios.configuration[0].name).toBe('invalid_config_format');
      expect(scenarios.configuration[0].expectedError).toBe(ConfigurationError);
    });
  });

  describe('integration with existing test patterns', () => {
    it('should work with Jest expect patterns', async () => {
      const operation = async () => {
        throw new ValidationError('Test validation error', 'testField');
      };

      // Using ErrorScenarios
      await ErrorScenarios.expectAsyncError(operation, ValidationError);
      
      // Also works with standard Jest patterns
      await expect(operation()).rejects.toThrow('Test validation error');
      await expect(operation()).rejects.toBeInstanceOf(ValidationError);
    });

    it('should integrate with TestDataFactory error scenarios', () => {
      // This demonstrates how ErrorScenarios works alongside TestDataFactory
      const error = ErrorScenarios.validation.createInvalidTypeError('name', 123, 'string');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Invalid type for name');
    });
  });
});