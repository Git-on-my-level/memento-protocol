# ErrorScenarios Usage Guide

The `ErrorScenarios` testing framework provides comprehensive utilities for testing error conditions in the Memento Protocol CLI. This guide demonstrates common usage patterns and best practices.

## Basic Usage

### Testing Async Operations

```typescript
import { ErrorScenarios } from '@/lib/testing';
import { FileSystemError, ValidationError } from '@/lib/errors';

describe('ConfigManager', () => {
  it('should handle missing config file gracefully', async () => {
    const configManager = new ConfigManager();
    
    // Test that loading missing config throws the expected error
    await ErrorScenarios.expectAsyncError(
      () => configManager.load('/missing/config.yaml'),
      FileSystemError,
      /File not found/
    );
  });

  it('should validate config format', async () => {
    const configManager = new ConfigManager();
    const invalidConfig = { defaultMode: 123 }; // Should be string
    
    // Test validation errors with specific message patterns
    await ErrorScenarios.expectAsyncError(
      () => configManager.save(invalidConfig),
      ValidationError,
      'Invalid type for defaultMode: expected string, got number'
    );
  });
});
```

### Testing Sync Operations

```typescript
describe('FuzzyMatcher', () => {
  it('should handle invalid patterns', () => {
    const matcher = new FuzzyMatcher();
    
    // Test sync operations that should throw
    ErrorScenarios.expectSyncError(
      () => matcher.match('', null as any),
      ValidationError,
      'Pattern cannot be null or undefined'
    );
  });
});
```

## Filesystem Error Simulation

```typescript
import { createTestFileSystem, ErrorScenarios } from '@/lib/testing';

describe('FileOperations', () => {
  let fs: MemoryFileSystemAdapter;

  beforeEach(async () => {
    fs = await createTestFileSystem({
      '/project/config.yaml': 'defaultMode: engineer'
    });
  });

  it('should handle permission denied errors', async () => {
    // Simulate permission denied for protected paths
    ErrorScenarios.filesystem.simulatePermissionDenied(fs, '/system');
    
    const fileManager = new FileManager(fs);
    
    await ErrorScenarios.expectAsyncError(
      () => fileManager.writeFile('/system/config.yaml', 'content'),
      FileSystemError,
      'Permission denied'
    );
  });

  it('should handle corrupted files', async () => {
    // Simulate file corruption
    ErrorScenarios.filesystem.simulateCorruptedFile(fs, '/project/config.yaml', 'invalid-yaml: [');
    
    const configManager = new ConfigManager(fs);
    
    await ErrorScenarios.expectAsyncError(
      () => configManager.load('/project/config.yaml'),
      ConfigurationError,
      /Invalid configuration file/
    );
  });

  it('should handle disk full scenarios', async () => {
    // Simulate disk full condition
    ErrorScenarios.filesystem.simulateDiskFull(fs);
    
    const fileManager = new FileManager(fs);
    
    await ErrorScenarios.expectAsyncError(
      () => fileManager.writeFile('/any-file.txt', 'content'),
      FileSystemError,
      'No space left on device'
    );
  });
});
```

## Network Error Simulation

```typescript
describe('PackageDownloader', () => {
  it('should handle network timeouts', async () => {
    const downloader = new PackageDownloader();
    
    // Mock network timeout
    const mockFetch = jest.fn().mockImplementation(() => 
      ErrorScenarios.network.simulateTimeout({ timeout: 5000 })
    );
    
    global.fetch = mockFetch;
    
    await ErrorScenarios.expectAsyncError(
      () => downloader.download('https://example.com/package.tar.gz'),
      Error,
      'Request timeout after 5000ms'
    );
  });

  it('should handle intermittent network failures', async () => {
    const downloader = new PackageDownloader();
    let attempt = 0;
    
    const unreliableOperation = ErrorScenarios.network.simulateIntermittentFailure(
      async () => {
        attempt++;
        return `Downloaded on attempt ${attempt}`;
      },
      0.7, // 70% failure rate
      'Network unstable'
    );

    // Test multiple attempts - some should fail, eventually one should succeed
    const results = await Promise.allSettled([
      unreliableOperation(),
      unreliableOperation(),
      unreliableOperation(),
      unreliableOperation(),
      unreliableOperation()
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    const successes = results.filter(r => r.status === 'fulfilled');
    
    expect(failures.length).toBeGreaterThan(0);
    expect(successes.length).toBeGreaterThan(0);
  });
});
```

## Error Recovery Testing

```typescript
describe('ResilientConfigLoader', () => {
  it('should implement graceful degradation', async () => {
    const loader = new ResilientConfigLoader();
    
    const primaryOperation = async () => {
      throw new FileSystemError('Primary config not found', '/config.yaml');
    };
    
    const fallbackOperation = async () => {
      return { defaultMode: 'engineer' }; // Default config
    };
    
    const result = await ErrorScenarios.testGracefulDegradation(
      primaryOperation,
      fallbackOperation,
      FileSystemError
    );
    
    expect(result.primaryFailed).toBe(true);
    expect(result.fallbackValue).toEqual({ defaultMode: 'engineer' });
  });

  it('should test retry mechanisms', async () => {
    const loader = new ResilientConfigLoader();
    let attempts = 0;
    
    const flakyOperation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return 'success';
    };
    
    const result = await ErrorScenarios.testRetryMechanism(
      flakyOperation,
      3, // max retries
      2  // expected failures before success
    );
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

## Error Chain Testing

```typescript
describe('NestedOperations', () => {
  it('should test error propagation chains', async () => {
    const operation = async () => {
      try {
        throw new FileSystemError('Disk read error', '/data.json');
      } catch (cause) {
        const wrapperError = new ConfigurationError('Failed to load configuration');
        (wrapperError as any).cause = cause;
        throw wrapperError;
      }
    };
    
    const error = await ErrorScenarios.expectAsyncError(operation, ConfigurationError);
    
    // Verify the error chain
    ErrorScenarios.expectErrorChain(error, ['ConfigurationError', 'FileSystemError']);
  });

  it('should test error context preservation', async () => {
    const operation = async () => {
      const error = new ValidationError('Validation failed', 'config');
      (error as any).context = {
        operation: 'config-validation',
        file: '/project/config.yaml',
        timestamp: '2023-01-01T00:00:00Z'
      };
      throw error;
    };
    
    const error = await ErrorScenarios.expectAsyncError(operation, ValidationError);
    
    // Verify error context
    ErrorScenarios.expectErrorContext(error, {
      operation: 'config-validation',
      file: '/project/config.yaml'
    });
  });
});
```

## Mock Error Injection

```typescript
describe('ComponentInstaller', () => {
  it('should handle installation failures', async () => {
    const installer = new ComponentInstaller();
    const mockFs = jest.mocked(fs);
    
    // Inject errors into specific file operations
    ErrorScenarios.injectError(
      mockFs.writeFile,
      new FileSystemError('Permission denied', '/protected/path'),
      ([path]) => path.startsWith('/protected')
    );
    
    await ErrorScenarios.expectAsyncError(
      () => installer.install('test-mode', '/protected/modes/'),
      FileSystemError,
      'Permission denied'
    );
  });
});
```

## Concurrent Error Testing

```typescript
describe('BatchProcessor', () => {
  it('should handle partial failures in batch operations', async () => {
    const processor = new BatchProcessor();
    
    const operations = [
      async () => 'success-1',
      async () => { throw new Error('error-1'); },
      async () => 'success-2',
      async () => { throw new Error('error-2'); },
      async () => 'success-3'
    ];
    
    const result = await ErrorScenarios.testConcurrentErrors(operations, 2);
    
    expect(result.results).toEqual(['success-1', 'success-2', 'success-3']);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map(e => e.message)).toEqual(['error-1', 'error-2']);
  });

  it('should test cascading failures', async () => {
    const operations = [
      async () => 'init-success',
      async () => 'validation-success',
      async () => 'installation-success'
    ];
    
    // Simulate failure starting at validation step
    const errors = await ErrorScenarios.testCascadingFailure(operations, 1);
    
    expect(errors).toHaveLength(2); // validation and installation should fail
    errors.forEach(error => {
      expect(error.message).toContain('failed due to cascade');
    });
  });
});
```

## Using Common Error Scenarios

```typescript
describe('comprehensive error testing', () => {
  it('should test all common error scenarios', async () => {
    const scenarios = ErrorScenarios.generateCommonScenarios();
    
    // Test filesystem scenarios
    for (const scenario of scenarios.filesystem) {
      const fs = new MemoryFileSystemAdapter();
      scenario.setup(fs);
      
      // Test that the setup correctly simulates the error
      // (Implementation would depend on specific component being tested)
    }
    
    // Test network scenarios
    for (const scenario of scenarios.network) {
      await ErrorScenarios.expectAsyncError(
        scenario.operation,
        scenario.expectedError
      );
    }
    
    // Test validation scenarios
    for (const scenario of scenarios.validation) {
      const validator = new DataValidator();
      await ErrorScenarios.expectAsyncError(
        () => validator.validate(scenario.data),
        scenario.expectedError
      );
    }
  });
});
```

## Best Practices

### 1. Use Specific Error Types
Always test for specific error types rather than generic `Error`:

```typescript
// Good
await ErrorScenarios.expectAsyncError(operation, FileSystemError);

// Less specific
await ErrorScenarios.expectAsyncError(operation, Error);
```

### 2. Test Error Messages
Include message patterns to ensure errors are meaningful:

```typescript
await ErrorScenarios.expectAsyncError(
  operation,
  ValidationError,
  /Missing required field: \w+/
);
```

### 3. Test Error Recovery Paths
Don't just test that errors occur - test that your system handles them appropriately:

```typescript
const { error, recoveredValue } = await ErrorScenarios.testErrorRecovery(
  faultyOperation,
  fallbackOperation,
  NetworkError
);

expect(recoveredValue).toBeDefined();
```

### 4. Use Realistic Error Scenarios
Create error conditions that could actually occur in production:

```typescript
// Realistic: file system full
ErrorScenarios.filesystem.simulateDiskFull(fs);

// Less realistic: all operations always fail
```

### 5. Combine with TestDataFactory
Use ErrorScenarios alongside TestDataFactory for comprehensive testing:

```typescript
const invalidPack = TestDataFactory.pack()
  .withInvalidManifest()
  .build();

await ErrorScenarios.expectAsyncError(
  () => packManager.install(invalidPack),
  ValidationError,
  /Invalid pack manifest/
);
```

This framework ensures consistent, comprehensive error testing across the Memento Protocol codebase while maintaining readability and maintainability of test suites.