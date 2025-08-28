# Memento Protocol Testing Framework Guide

A comprehensive testing framework designed to make testing in Memento Protocol CLI efficient, consistent, and maintainable. This framework provides utilities for filesystem testing, mock management, data generation, error scenarios, and standardized testing patterns.

## Table of Contents

- [Quick Start](#quick-start)
- [Framework Overview](#framework-overview)
- [Core Components](#core-components)
- [Testing Patterns](#testing-patterns)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Quick Start

### Basic Setup

```typescript
import { createFullTestEnvironment } from '@/lib/testing';

describe('My Feature', () => {
  it('should work correctly', async () => {
    // Create a complete test environment
    const testEnv = await createFullTestEnvironment({
      name: 'Feature test',
      filesystem: {
        '/project/package.json': '{"name": "test-project"}',
        '/project/.memento/config.json': '{}'
      },
      mocks: ['fs', 'inquirer']
    });

    // Use the environment
    const config = testEnv.data.config()
      .withProjectType('typescript')
      .build();

    await testEnv.files.createJson('/project/.memento/config.json', config);
    await testEnv.assert.fileExists('/project/.memento/config.json');
    
    await testEnv.cleanup();
  });
});
```

### Simple Unit Test

```typescript
import { createQuickTest } from '@/lib/testing';

describe('Unit Tests', () => {
  it('should validate config', async () => {
    const { data, errors } = createQuickTest('Config validation');
    
    const config = data.config().withProjectType('typescript').build();
    expect(config.projectType).toBe('typescript');
    
    await errors.expectError(
      () => validateInvalidConfig(null),
      'Null config should fail'
    );
  });
});
```

### CLI Testing

```typescript
import { createCliTest } from '@/lib/testing';

describe('CLI Commands', () => {
  it('should handle init command', async () => {
    const cliTest = await createCliTest({
      name: 'Init command test',
      filesystem: { '/project': {} },
      inquirerResponses: { 'confirm-init': true },
      childProcessConfig: { exitCode: 0, stdout: 'Initialized successfully' }
    });

    const result = await cliTest.runCommand('init', ['--force']);
    
    cliTest.assertOutput(/Initialized successfully/);
    cliTest.assertExitCode(0);
    await cliTest.assertFilesCreated(['.memento/config.json']);
  });
});
```

## Framework Overview

The Memento Protocol Testing Framework follows these core principles:

1. **Consistency**: Standardized patterns for common testing scenarios
2. **Efficiency**: Reusable utilities to reduce boilerplate code
3. **Isolation**: Clean test environments with proper setup and teardown
4. **Integration**: Seamless integration between different testing utilities
5. **Documentation**: Self-documenting code with comprehensive examples

### Architecture

```
Testing Framework
├── Core Utilities
│   ├── TestDataFactory - Builder patterns for test data
│   ├── MockFactory - Mock creation and management
│   ├── ErrorScenarios - Error testing utilities
│   └── TestCategories - Test organization and metadata
├── Testing Patterns
│   ├── AAA (Arrange-Act-Assert)
│   ├── GWT (Given-When-Then)
│   ├── Table-driven tests
│   └── Integration patterns
├── Filesystem Testing
│   ├── In-memory filesystem adapters
│   ├── Assertion helpers
│   └── File manipulation utilities
└── Convenience Functions
    ├── createFullTestEnvironment()
    ├── createQuickTest()
    ├── createCliTest()
    └── createIntegrationScenario()
```

## Core Components

### 1. TestDataFactory

Builder pattern for creating consistent test data:

```typescript
import { TestDataFactory } from '@/lib/testing';

// Create a mode with custom properties
const mode = TestDataFactory.mode()
  .withName('test-engineer')
  .withDescription('Test engineer mode')
  .withTags(['engineering', 'test'])
  .withContent(`
# Test Engineer Mode
You are a test engineer focused on quality assurance.
  `)
  .build();

// Create a pack with components
const pack = TestDataFactory.pack()
  .withName('testing-pack')
  .withCategory('general')
  .withComponents({
    modes: [{ name: 'test-engineer', required: true }],
    workflows: [{ name: 'test-workflow', required: false }]
  })
  .build();

// Create CLI options
const options = TestDataFactory.cliOptions()
  .withForce(true)
  .withNonInteractive(true)
  .withVerbose(false)
  .build();
```

Available builders:
- `mode()` - Create mode components
- `workflow()` - Create workflow components  
- `agent()` - Create agent components
- `pack()` - Create starter pack definitions
- `config()` - Create project configurations
- `ticket()` - Create ticket information
- `hook()` - Create hook configurations
- `cliOptions()` - Create CLI option objects

### 2. MockFactory

Comprehensive mock creation with state tracking:

```typescript
import { MockFactory, setupMockFactory } from '@/lib/testing';

describe('Mock Tests', () => {
  let mockFactory: ReturnType<typeof setupMockFactory>;
  
  beforeEach(() => {
    mockFactory = setupMockFactory();
  });

  it('should mock filesystem operations', async () => {
    const fsMock = mockFactory.fileSystem()
      .withExistingStructure({
        '/project/.memento': {},
        '/project/package.json': '{"name": "test"}'
      })
      .withReadFile('/project/package.json', '{"name": "test"}')
      .build();

    // Use fsMock in tests
    expect(await fsMock.exists('/project/.memento')).toBe(true);
    expect(fsMock.getCallHistory('exists')).toHaveLength(1);
  });

  it('should mock inquirer prompts', async () => {
    const inquirerMock = mockFactory.inquirer()
      .withPromptResponses({
        'mode-selection': 'engineer',
        'confirm-install': true
      })
      .build();

    // inquirerMock will return predefined responses
    expect(inquirerMock.getResponse('mode-selection')).toBe('engineer');
  });
});
```

### 3. ErrorScenarios

Standardized error testing:

```typescript
import { ErrorScenarios } from '@/lib/testing';

describe('Error Handling', () => {
  it('should handle invalid configurations', async () => {
    const errorTest = await ErrorScenarios.expectError(
      () => {
        throw new Error('Invalid configuration');
      },
      'Invalid config should throw error'
    );

    expect(errorTest.success).toBe(true);
    expect(errorTest.error?.message).toBe('Invalid configuration');
  });

  it('should handle async errors', async () => {
    await ErrorScenarios.expectAsyncError(
      async () => {
        throw new Error('Async operation failed');
      },
      'Async error handling'
    );
  });
});
```

### 4. TestCategories

Organize and categorize tests:

```typescript
import { TestCategories, JestTestCategories } from '@/lib/testing';

// Register test metadata
JestTestCategories.register({
  name: 'Config Management Tests',
  category: 'unit',
  speed: 'fast',
  priority: 'high',
  environment: 'node',
  dependencies: ['filesystem']
});

describe('Config Management', () => {
  it('should load config', () => {
    // Test implementation
  });
});

// Filter tests by category
const unitTests = TestCategories.filter({ category: 'unit' });
const fastTests = TestCategories.filter({ speed: 'fast' });
```

## Testing Patterns

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
import { aaa } from '@/lib/testing';

it('should save configuration', async () => {
  await aaa({
    name: 'Config save operation',
    arrange: async () => {
      const fs = await createTestFileSystem({});
      const config = TestDataFactory.config()
        .withProjectType('typescript')
        .build();
      return { fs, config };
    },
    act: (context) => {
      return configManager.save(context.config, context.fs);
    },
    assert: async (context, result) => {
      expect(result).toBeDefined();
      await assertFileExists(context.fs, '/project/.memento/config.json');
    }
  });
});
```

### 2. GWT Pattern (Given-When-Then)

```typescript
import { gwt } from '@/lib/testing';

it('should install pack successfully', async () => {
  await gwt({
    name: 'Pack installation',
    given: async () => {
      // Given: A project with existing configuration
      const fs = await createTestFileSystem({
        '/project/.memento/config.json': '{}'
      });
      const pack = TestDataFactory.pack()
        .withName('frontend-react')
        .build();
      return { fs, pack };
    },
    when: async (context) => {
      // When: Installing the pack
      return await packManager.install(context.pack, context.fs);
    },
    then: async (context, result) => {
      // Then: Pack should be installed successfully
      expect(result.success).toBe(true);
      await assertFileExists(context.fs, '/project/.memento/packs/frontend-react.json');
    }
  });
});
```

### 3. Table-Driven Tests

```typescript
import { table } from '@/lib/testing';

interface FuzzyMatchScenario {
  input: string;
  expected: string;
  description: string;
}

it('should handle fuzzy matching', async () => {
  const scenarios: FuzzyMatchScenario[] = [
    { input: 'eng', expected: 'engineer', description: 'simple abbreviation' },
    { input: 'apm', expected: 'autonomous-project-manager', description: 'acronym match' },
    { input: 'fe-arch', expected: 'frontend-architect', description: 'hyphenated match' }
  ];

  await table('Fuzzy matching scenarios', scenarios, (scenario) => {
    const result = fuzzyMatch(scenario.input, availableModes);
    expect(result).toBe(scenario.expected);
  });
});
```

### 4. Integration Patterns

```typescript
import { createIntegrationScenario } from '@/lib/testing';

it('should handle complete workflow', async () => {
  const scenario = createIntegrationScenario('Complete pack installation workflow')
    .withFilesystem({
      '/project/.memento': {},
      '/project/package.json': '{"name": "test-project"}'
    })
    .withMocks(['fs', 'inquirer', 'childProcess'])
    .withComponents(['config', 'packs', 'cli'])
    .withSetup(async (env) => {
      await env.files.createJson('/project/.memento/config.json', {
        version: '1.0.0',
        projectType: 'typescript'
      });
    })
    .build();

  await scenario.execute(async (env) => {
    // Test complete workflow
    const pack = env.data.pack().withName('test-pack').build();
    // ... test implementation
  });
});
```

## Best Practices

### 1. Test Organization

```typescript
// Good: Organize tests with consistent structure
describe('ConfigManager', () => {
  describe('load()', () => {
    it('should load valid config', async () => { /* ... */ });
    it('should handle missing config file', async () => { /* ... */ });
    it('should validate config schema', async () => { /* ... */ });
  });

  describe('save()', () => {
    it('should save config to filesystem', async () => { /* ... */ });
    it('should create directories if needed', async () => { /* ... */ });
  });
});
```

### 2. Use Test Data Factories

```typescript
// Good: Use builders for consistent test data
const config = TestDataFactory.config()
  .withProjectType('typescript')
  .withVersion('2.0.0')
  .build();

// Avoid: Manual object creation
const config = {
  version: '2.0.0',
  projectType: 'typescript',
  hooks: [],
  // ... many more fields
};
```

### 3. Proper Error Testing

```typescript
// Good: Use ErrorScenarios for consistent error testing
await ErrorScenarios.expectError(
  () => validateConfig(invalidConfig),
  'Invalid config validation'
);

// Avoid: Manual try-catch blocks
try {
  validateConfig(invalidConfig);
  fail('Should have thrown error');
} catch (error) {
  expect(error.message).toContain('Invalid');
}
```

### 4. Clean Test Environments

```typescript
// Good: Use createFullTestEnvironment with cleanup
it('should test feature', async () => {
  const testEnv = await createFullTestEnvironment({
    name: 'Feature test',
    filesystem: { /* initial state */ }
  });

  try {
    // Test implementation
  } finally {
    await testEnv.cleanup();
  }
});
```

### 5. Meaningful Test Names

```typescript
// Good: Descriptive test names
it('should create .memento directory when initializing new project', async () => {});
it('should preserve existing hooks when updating configuration', async () => {});

// Avoid: Generic test names
it('should work', async () => {});
it('should test init', async () => {});
```

## Migration Guide

### From Manual Mocks to MockFactory

**Before:**
```typescript
// Old approach - manual mocking
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;
mockFs.readFile.mockResolvedValue('file content');
mockFs.exists.mockResolvedValue(true);
```

**After:**
```typescript
// New approach - MockFactory
const mockFactory = setupMockFactory();
const fsMock = mockFactory.fileSystem()
  .withReadFile('/path/file.txt', 'file content')
  .withExistingFile('/path/file.txt')
  .build();
```

### From Manual Test Data to TestDataFactory

**Before:**
```typescript
// Old approach - manual object creation
const mode = {
  name: 'test-mode',
  description: 'Test mode description',
  author: 'test-author',
  version: '1.0.0',
  tags: ['test'],
  content: '# Test Mode\nTest content'
};
```

**After:**
```typescript
// New approach - TestDataFactory
const mode = TestDataFactory.mode()
  .withName('test-mode')
  .withDescription('Test mode description')
  .withAuthor('test-author')
  .build();
```

### From Try-Catch to ErrorScenarios

**Before:**
```typescript
// Old approach - manual error testing
it('should handle errors', async () => {
  try {
    await riskyOperation();
    fail('Should have thrown error');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain('validation failed');
  }
});
```

**After:**
```typescript
// New approach - ErrorScenarios
it('should handle errors', async () => {
  const errorTest = await ErrorScenarios.expectError(
    () => riskyOperation(),
    'Risky operation error handling'
  );
  
  expect(errorTest.success).toBe(true);
  expect(errorTest.error).toBeInstanceOf(ValidationError);
});
```

### Complete Migration Example

**Before:**
```typescript
describe('Config Management', () => {
  let mockFs: jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
  });

  it('should load config', async () => {
    const configContent = JSON.stringify({
      version: '1.0.0',
      projectType: 'typescript',
      hooks: []
    });
    
    mockFs.readFile.mockResolvedValue(configContent);
    mockFs.exists.mockResolvedValue(true);
    
    const config = await configManager.load('/project');
    
    expect(config.version).toBe('1.0.0');
    expect(mockFs.readFile).toHaveBeenCalledWith('/project/.memento/config.json');
  });
});
```

**After:**
```typescript
import { createFullTestEnvironment } from '@/lib/testing';

describe('Config Management', () => {
  it('should load config', async () => {
    const testEnv = await createFullTestEnvironment({
      name: 'Config load test',
      filesystem: {
        '/project/.memento/config.json': JSON.stringify(
          testEnv.data.config()
            .withVersion('1.0.0')
            .withProjectType('typescript')
            .build()
        )
      }
    });

    try {
      const config = await configManager.load('/project', testEnv.fs);
      expect(config.version).toBe('1.0.0');
      await testEnv.assert.fileExists('/project/.memento/config.json');
    } finally {
      await testEnv.cleanup();
    }
  });
});
```

## Performance Considerations

### 1. Test Environment Reuse

```typescript
// Good: Reuse test environments when possible
describe('Multiple related tests', () => {
  const suite = createTestSuite('Config tests', {
    commonFilesystem: {
      '/project/.memento/config.json': '{}'
    },
    commonMocks: ['fs']
  });

  it('should load config', suite.test(async (env) => {
    // Test implementation
  }));

  it('should save config', suite.test(async (env) => {
    // Test implementation  
  }));
});
```

### 2. Lazy Loading

```typescript
// Good: Create test data only when needed
it('should handle large datasets', async () => {
  const testEnv = await createQuickTest('Large dataset test');
  
  // Create data on demand
  const modes = Array.from({ length: 1000 }, (_, i) => 
    testEnv.data.mode().withName(`mode-${i}`).build()
  );
  
  // Test implementation
});
```

### 3. Parallel Test Execution

```typescript
// Good: Design tests for parallel execution
describe('Independent tests', () => {
  // Each test uses isolated environment
  it('should test feature A', async () => {
    const env = await createFullTestEnvironment({ name: 'Feature A' });
    // Test A implementation
    await env.cleanup();
  });

  it('should test feature B', async () => {
    const env = await createFullTestEnvironment({ name: 'Feature B' });  
    // Test B implementation
    await env.cleanup();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Memory Leaks in Tests

**Problem:** Tests using large amounts of memory or not cleaning up properly.

**Solution:** Always call cleanup and use proper test isolation:

```typescript
it('should clean up properly', async () => {
  const testEnv = await createFullTestEnvironment({
    name: 'Memory test'
  });

  try {
    // Test implementation
  } finally {
    await testEnv.cleanup(); // Always cleanup
  }
});
```

#### 2. Mock State Bleeding Between Tests

**Problem:** Mock calls from previous tests affecting current test.

**Solution:** Use `setupMockFactory()` and reset properly:

```typescript
describe('Mock tests', () => {
  let mockFactory: ReturnType<typeof setupMockFactory>;

  beforeEach(() => {
    mockFactory = setupMockFactory(); // Fresh factory for each test
  });

  afterEach(() => {
    mockFactory.reset(); // Clean up mock state
  });
});
```

#### 3. File System Test Conflicts

**Problem:** Tests interfering with each other's filesystem operations.

**Solution:** Use isolated test filesystems:

```typescript
// Good: Each test gets its own filesystem
it('should handle filesystem operations', async () => {
  const fs = await createTestFileSystem({
    // Test-specific initial state
  });
  
  // Test implementation with isolated fs
});
```

#### 4. Async Test Timing Issues

**Problem:** Tests failing intermittently due to timing.

**Solution:** Use proper async patterns and timeouts:

```typescript
import { TestPatterns } from '@/lib/testing';

it('should handle async operations', async () => {
  await TestPatterns.asyncPatterns.eventually(
    async () => {
      const result = await someAsyncOperation();
      return result.isComplete;
    },
    { timeout: 5000, interval: 100 }
  );
});
```

### Debug Tips

#### 1. Enable Verbose Logging

```typescript
const testEnv = await createFullTestEnvironment({
  name: 'Debug test',
  // Enable verbose logging for debugging
  filesystem: { '/project': {} }
});

// Check filesystem state
console.log('Filesystem contents:', await testEnv.files.readStructure('/'));
```

#### 2. Inspect Mock Call History

```typescript
const fsMock = mockFactory.fileSystem().build();

// After test operations
console.log('FS calls:', fsMock.getCallHistory());
console.log('Global mock state:', mockFactory.getGlobalState());
```

#### 3. Validate Test Environment

```typescript
it('should validate test environment', async () => {
  const testEnv = await createFullTestEnvironment({
    name: 'Environment validation'
  });

  // Verify utilities are available
  expect(testEnv.data).toBeDefined();
  expect(testEnv.patterns).toBeDefined();
  expect(testEnv.assert).toBeDefined();
  expect(testEnv.files).toBeDefined();
});
```

## API Reference

### Core Functions

#### `createFullTestEnvironment(options)`
Creates a complete test environment with all utilities configured.

**Parameters:**
- `options.name` - Test environment name
- `options.filesystem` - Initial filesystem structure (optional)
- `options.mocks` - Array of mock types to create (optional)
- `options.projectRoot` - Project root path (optional)

**Returns:** Complete test environment object

#### `createQuickTest(name)`
Creates a minimal test environment for unit tests.

**Parameters:**
- `name` - Test name

**Returns:** Basic test utilities object

#### `createCliTest(options)`
Creates a CLI-specific test environment with command simulation.

**Parameters:**
- `options.name` - Test name
- `options.filesystem` - Initial filesystem (optional)
- `options.inquirerResponses` - Predefined prompt responses (optional)
- `options.childProcessConfig` - Child process mock configuration (optional)

**Returns:** CLI test environment with command utilities

#### `createIntegrationScenario(name)`
Creates a builder for complex integration test scenarios.

**Parameters:**  
- `name` - Scenario name

**Returns:** Integration scenario builder

### TestDataFactory Builders

- `TestDataFactory.mode()` - Mode component builder
- `TestDataFactory.workflow()` - Workflow component builder  
- `TestDataFactory.agent()` - Agent component builder
- `TestDataFactory.pack()` - Starter pack builder
- `TestDataFactory.config()` - Configuration builder
- `TestDataFactory.ticket()` - Ticket information builder
- `TestDataFactory.hook()` - Hook configuration builder
- `TestDataFactory.cliOptions()` - CLI options builder

### MockFactory Builders

- `MockFactory.fileSystem()` - Filesystem mock builder
- `MockFactory.inquirer()` - Inquirer mock builder
- `MockFactory.childProcess()` - Child process mock builder
- `MockFactory.commander()` - Commander CLI mock builder
- `MockFactory.axios()` - HTTP client mock builder

### Testing Patterns

- `aaa(config)` - Arrange-Act-Assert pattern
- `gwt(config)` - Given-When-Then pattern  
- `table(name, scenarios, testFn)` - Table-driven tests
- `cli(config)` - CLI command testing pattern

### Error Testing

- `ErrorScenarios.expectError(fn, description)` - Synchronous error testing
- `ErrorScenarios.expectAsyncError(fn, description)` - Asynchronous error testing

### Filesystem Utilities

- `createTestFileSystem(structure)` - Create in-memory filesystem
- `assertFileExists(fs, path)` - Assert file existence
- `assertFileContains(fs, path, content)` - Assert file content
- `assertJsonFileContains(fs, path, expected)` - Assert JSON file content

---

This testing framework provides everything needed to write comprehensive, maintainable tests for the Memento Protocol CLI. For additional examples and advanced usage patterns, see the integration tests in `src/lib/testing/__tests__/testing.test.ts`.