# TestPatterns Library

A comprehensive testing patterns library for the Memento Protocol CLI that provides reusable, standardized testing patterns to ensure consistency and reliability across the entire test suite.

## Overview

The TestPatterns library builds upon the existing testing infrastructure (TestDataFactory, ErrorScenarios, MockFactory) to provide a complete testing solution with common patterns, CLI-specific helpers, async testing utilities, and performance benchmarking tools.

## Table of Contents

- [Installation](#installation)
- [Core Patterns](#core-patterns)
  - [Arrange-Act-Assert (AAA)](#arrange-act-assert-aaa)
  - [Given-When-Then (GWT)](#given-when-then-gwt)
  - [Setup-Execute-Verify (SEV)](#setup-execute-verify-sev)
  - [Table-Driven Testing](#table-driven-testing)
  - [Property-Based Testing](#property-based-testing)
- [CLI Testing Patterns](#cli-testing-patterns)
  - [Command Testing](#command-testing)
  - [Interactive Flow Testing](#interactive-flow-testing)
- [Async Testing Patterns](#async-testing-patterns)
  - [Concurrent Operations](#concurrent-operations)
  - [Race Condition Testing](#race-condition-testing)
  - [Timeout Testing](#timeout-testing)
  - [Retry Mechanism Testing](#retry-mechanism-testing)
  - [Event Emitter Testing](#event-emitter-testing)
- [File System Testing](#file-system-testing)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)
- [Enhanced Assertions](#enhanced-assertions)
- [Test Organization](#test-organization)
- [Utilities and Helpers](#utilities-and-helpers)
- [Best Practices](#best-practices)

## Installation

```typescript
import { TestPatterns, TestScenarios, createTestContext } from '@/lib/testing';

// Or import specific patterns
import { aaa, table, cli, asyncPatterns } from '@/lib/testing';
```

## Core Patterns

### Arrange-Act-Assert (AAA)

The AAA pattern provides a clear structure for organizing tests with automatic cleanup.

```typescript
await TestPatterns.aaa({
  arrange: async () => {
    const fs = await createTestFileSystem({});
    const config = TestDataFactory.config()
      .withDefaultMode('engineer')
      .build();
    return { fs, config };
  },
  act: async (context) => {
    return await configManager.save(context.config, context.fs);
  },
  assert: (context, result) => {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  },
  cleanup: async (context) => {
    // Optional cleanup - runs even if assert fails
    await context.fs.cleanup();
  }
});
```

### Given-When-Then (GWT)

BDD-style testing pattern for behavior verification.

```typescript
await TestPatterns.gwt({
  given: () => ({
    user: { id: 1, name: 'John' },
    repository: new UserRepository()
  }),
  when: (context) => context.repository.save(context.user),
  then: (context, result) => {
    expect(result.id).toBe(context.user.id);
    expect(result.savedAt).toBeDefined();
  }
});
```

### Setup-Execute-Verify (SEV)

Alternative to AAA with more explicit naming.

```typescript
await TestPatterns.sev({
  setup: () => ({
    database: new TestDatabase(),
    service: new UserService()
  }),
  execute: (context) => context.service.createUser('test@example.com'),
  verify: (context, result) => {
    expect(result.email).toBe('test@example.com');
    expect(context.database.users).toContain(result);
  }
});
```

### Table-Driven Testing

Run multiple test scenarios from a data table.

```typescript
TestPatterns.table('fuzzy matching scenarios', [
  { 
    description: 'simple abbreviation', 
    input: 'eng', 
    expected: 'engineer' 
  },
  { 
    description: 'acronym match', 
    input: 'apm', 
    expected: 'autonomous-project-manager' 
  },
  { 
    description: 'exact match', 
    input: 'architect', 
    expected: 'architect',
    skip: false // Can skip individual scenarios
  }
], (scenario) => {
  const result = fuzzyMatcher.match(scenario.input);
  expect(result.bestMatch).toBe(scenario.expected);
});
```

### Property-Based Testing

Generate test cases and verify properties hold across all inputs.

```typescript
TestPatterns.property(
  'string concatenation is associative',
  () => ({
    a: Math.random().toString(36),
    b: Math.random().toString(36),
    c: Math.random().toString(36)
  }),
  ({ a, b, c }) => (a + b) + c === a + (b + c),
  { iterations: 100 }
);
```

## CLI Testing Patterns

### Command Testing

Test CLI commands with expected outputs and file system effects.

```typescript
await TestPatterns.cli.testCommand({
  command: 'init',
  args: ['--force', '--non-interactive'],
  expectedOutput: /Initialized successfully/,
  expectedFiles: [
    '.memento/config.json',
    '.claude/settings.local.json'
  ],
  unexpectedFiles: [
    '.memento/old-config.json'
  ],
  timeout: 10000,
  exitCode: 0
});
```

### Interactive Flow Testing

Test interactive CLI flows with simulated user input.

```typescript
const output = await TestPatterns.cli.testInteractiveFlow('init', [
  {
    prompt: 'Select a mode:',
    answer: 'engineer',
    delay: 100
  },
  {
    prompt: /Continue with setup\?/,
    answer: true,
    delay: 50
  },
  {
    prompt: 'Enter project name:',
    answer: 'my-project'
  }
]);

expect(output).toContain('Setup completed successfully');
```

## Async Testing Patterns

### Concurrent Operations

Test operations running simultaneously.

```typescript
const results = await TestPatterns.async.testConcurrent({
  operation: async () => {
    const ticket = await ticketManager.create('test-ticket');
    return ticket.id;
  },
  concurrency: 10,
  timeout: 5000,
  validator: (results) => {
    // All ticket IDs should be unique
    return new Set(results).size === results.length;
  }
});

expect(results).toHaveLength(10);
```

### Race Condition Testing

Detect race conditions in shared resource access.

```typescript
let counter = 0;
const operations = [
  async () => {
    const current = counter;
    await new Promise(resolve => setTimeout(resolve, 10));
    counter = current + 1;
    return counter;
  },
  async () => {
    const current = counter;
    await new Promise(resolve => setTimeout(resolve, 5));
    counter = current + 2;
    return counter;
  }
];

const results = await TestPatterns.async.testRaceCondition(
  operations,
  (results) => {
    // Verify race condition behavior
    return results.every(r => typeof r === 'number');
  }
);
```

### Timeout Testing

Test operations with timeout constraints.

```typescript
// Test that operation completes within timeout
const result = await TestPatterns.async.testTimeout(
  () => fastOperation(),
  1000,
  false // Don't expect timeout
);

// Test that slow operation times out
const nullResult = await TestPatterns.async.testTimeout(
  () => slowOperation(),
  100,
  true // Expect timeout
);

expect(result).toBe('completed');
expect(nullResult).toBeNull();
```

### Retry Mechanism Testing

Test retry logic with controlled failures.

```typescript
const { result, attempts } = await TestPatterns.async.testRetry(
  () => flakyNetworkCall(),
  maxRetries: 3,
  shouldSucceedOnAttempt: 2
);

expect(result).toBe('success');
expect(attempts).toBe(2);
```

### Event Emitter Testing

Validate event sequences and data.

```typescript
const emitter = new HookEventEmitter();

await TestPatterns.async.testEventEmitter(
  emitter,
  [
    { event: 'hook:start', data: { hookId: 'test-hook' } },
    { event: 'hook:progress', data: { percent: 50 } },
    { event: 'hook:complete', data: { result: 'success' } }
  ],
  5000 // timeout
);
```

## File System Testing

### File Operations Testing

Test file CRUD operations with expected results.

```typescript
await TestPatterns.fs.testFileOperations([
  {
    type: 'create',
    path: '/project/.memento/config.json',
    content: JSON.stringify({ version: '1.0.0' }),
    expectedResult: true
  },
  {
    type: 'update',
    path: '/project/.memento/config.json',
    content: JSON.stringify({ version: '1.1.0' })
  },
  {
    type: 'delete',
    path: '/project/old-config.json',
    expectedResult: false
  }
], testFileSystem);
```

### Directory Structure Validation

Verify expected directory structures and file contents.

```typescript
await TestPatterns.fs.testDirectoryStructure({
  '/project/.memento/modes/engineer.md': 'Expected content',
  '/project/.memento/config.json': JSON.stringify({ mode: 'engineer' }),
  '/project/.claude/commands/mode.md': null // File exists but content not checked
}, testFileSystem);
```

### File Watching and Change Detection

Test file watching mechanisms.

```typescript
const events = await TestPatterns.fs.testFileWatching(
  '/project/watched-file.txt',
  [
    { content: 'First change', delay: 100 },
    { content: 'Second change', delay: 200 },
    { content: 'Final change', delay: 100 }
  ],
  testFileSystem
);

expect(events).toHaveLength(3);
expect(events.every(e => e.event === 'change')).toBe(true);
```

## Integration Testing

### API Contract Testing

Validate API contracts with multiple test cases.

```typescript
await TestPatterns.integration.testAPIContract(
  packValidator.validate,
  [
    {
      name: 'valid pack',
      input: validPackManifest,
      validator: (result) => result.valid === true
    },
    {
      name: 'invalid pack - missing name',
      input: { ...validPackManifest, name: undefined },
      validator: (result) => result.errors.some(e => e.includes('name'))
    },
    {
      name: 'malformed pack',
      input: null,
      shouldThrow: true
    }
  ]
);
```

### Multi-Component Workflow Testing

Test complex workflows involving multiple components.

```typescript
const finalContext = await TestPatterns.integration.testWorkflow(
  'pack installation workflow',
  [
    {
      name: 'validate pack',
      action: async (ctx) => ({
        ...ctx,
        validationResult: await packValidator.validate(ctx.pack)
      }),
      validator: (ctx) => ctx.validationResult.valid
    },
    {
      name: 'resolve dependencies',
      action: async (ctx) => ({
        ...ctx,
        dependencies: await packInstaller.resolveDependencies(ctx.pack)
      }),
      validator: (ctx) => Array.isArray(ctx.dependencies)
    },
    {
      name: 'install pack',
      action: async (ctx) => ({
        ...ctx,
        result: await packInstaller.install(ctx.pack, ctx.dependencies)
      }),
      validator: (ctx) => ctx.result.success
    }
  ],
  { pack: testPack }
);

expect(finalContext.result.installedComponents).toBeDefined();
```

### End-to-End Testing

Test complete user scenarios from start to finish.

```typescript
await TestPatterns.integration.testE2E(
  'complete project setup',
  async () => ({
    projectDir: await createTempDir(),
    user: { name: 'test-user', preferences: { mode: 'engineer' } }
  }),
  async (context) => {
    // Execute complete setup flow
    return await mementoCore.initializeProject(
      context.projectDir,
      context.user.preferences
    );
  },
  async (context, result) => {
    // Verify end state
    expect(result.success).toBe(true);
    expect(await fs.exists(path.join(context.projectDir, '.memento'))).toBe(true);
    expect(await fs.exists(path.join(context.projectDir, '.claude'))).toBe(true);
  },
  async (context) => {
    // Cleanup
    await fs.rmdir(context.projectDir, { recursive: true });
  }
);
```

## Performance Testing

### Benchmarking

Measure execution times and detect performance regressions.

```typescript
const results = await TestPatterns.performance.benchmark({
  operation: () => fuzzyMatcher.findBestMatch('eng', allModes),
  iterations: 1000,
  warmupIterations: 100,
  maxTime: 10 // Fail if average time > 10ms
});

console.log(`Average time: ${results.averageTime.toFixed(2)}ms`);
console.log(`Min/Max: ${results.minTime.toFixed(2)}ms / ${results.maxTime.toFixed(2)}ms`);
```

### Memory Leak Detection

Detect memory leaks in operations.

```typescript
await TestPatterns.performance.testMemoryLeak(
  async () => {
    const pack = await packManager.loadPack('large-pack');
    await packManager.processPack(pack);
    // Should clean up memory after processing
  },
  iterations: 500,
  threshold: 100 * 1024 * 1024 // 100MB threshold
);
```

### Load Testing

Test system behavior under high load.

```typescript
const loadResults = await TestPatterns.performance.loadTest(
  () => apiClient.createTicket({ title: 'Load test ticket' }),
  concurrency: 50,
  duration: 30000, // 30 seconds
  maxErrorRate: 0.02 // 2% max error rate
);

expect(loadResults.requestsPerSecond).toBeGreaterThan(100);
expect(loadResults.averageResponseTime).toBeLessThan(500);
```

## Enhanced Assertions

### Eventually Consistent Assertions

Wait for conditions to become true over time.

```typescript
await TestPatterns.assertions.eventually({
  assertion: async () => {
    const status = await backgroundJob.getStatus();
    return status === 'completed';
  },
  timeout: 10000,
  interval: 500,
  message: 'Background job did not complete in time'
});
```

### Partial Object Matching

Match objects partially with deep comparison.

```typescript
const result = await userService.getProfile(userId);

TestPatterns.assertions.toMatchPartial(result, {
  id: userId,
  profile: {
    preferences: {
      theme: 'dark'
    }
  }
  // Other fields ignored
});
```

### Custom Deep Equality

Use custom matchers for specific properties.

```typescript
TestPatterns.assertions.toDeepEqualWith(
  actualResult,
  expectedResult,
  {
    'timestamp': (received, expected) => {
      // Custom date comparison
      return Math.abs(new Date(received) - new Date(expected)) < 1000;
    },
    'id': (received, expected) => {
      // ID can be any UUID format
      return /^[0-9a-f-]{36}$/.test(received);
    }
  }
);
```

## Test Organization

### Test Suites with Shared Setup

Create test suites with shared context and cleanup.

```typescript
TestPatterns.organization.suite(
  'Pack Installation Tests',
  async () => {
    // Shared setup
    const fs = await createTestFileSystem({});
    const packManager = new PackManager(fs);
    return { fs, packManager };
  },
  async (context) => {
    // Shared cleanup
    await context.fs.cleanup();
  },
  (context) => {
    it('should install valid pack', async () => {
      const result = await context.packManager.install(validPack);
      expect(result.success).toBe(true);
    });

    it('should reject invalid pack', async () => {
      await expect(
        context.packManager.install(invalidPack)
      ).rejects.toThrow();
    });
  }
);
```

### Parameterized Tests

Run the same test logic with different data sets.

```typescript
TestPatterns.organization.parameterized(
  'Configuration validation',
  () => [
    { config: validConfig, shouldPass: true },
    { config: configMissingName, shouldPass: false },
    { config: configInvalidType, shouldPass: false }
  ],
  async (testData, index) => {
    const result = await configValidator.validate(testData.config);
    
    if (testData.shouldPass) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  }
);
```

### Automatic Cleanup Management

Register cleanup functions that run automatically.

```typescript
const result = await TestPatterns.organization.withCleanup(async (cleanup) => {
  const tempFile = '/tmp/test-file.txt';
  await fs.writeFile(tempFile, 'test content');
  
  cleanup(async () => {
    if (await fs.exists(tempFile)) {
      await fs.unlink(tempFile);
    }
  });

  const server = new TestServer();
  await server.start();
  
  cleanup(async () => {
    await server.stop();
  });

  return await runTestWithServer(server);
});

// All cleanup functions run automatically, even if test throws
```

## Utilities and Helpers

### Test Context Creation

Create structured test contexts with cleanup management.

```typescript
const context = createTestContext({
  database: testDatabase,
  user: testUser,
  settings: testSettings
});

// Add cleanup functions
context.cleanup.push(async () => {
  await testDatabase.clear();
});

// Use in tests
expect(context.data.user.id).toBeDefined();
```

### Pre-built Test Scenarios

Use common test scenarios from TestScenarios.

```typescript
// Complete Memento project setup
const scenario = await TestScenarios.mementoProject();
expect(scenario.data.fs).toBeDefined();
expect(await scenario.data.fs.exists('/project/package.json')).toBe(true);

// CLI testing with mocks
const cliScenario = await TestScenarios.cliTest();
expect(cliScenario.data.mockInquirer).toBeDefined();
expect(cliScenario.data.mockFs).toBeDefined();
```

## Integration with Existing Infrastructure

### TestDataFactory Integration

```typescript
await TestPatterns.aaa({
  arrange: () => ({
    pack: TestDataFactory.pack()
      .withName('test-pack')
      .withComponents(['engineer-mode', 'review-workflow'])
      .build(),
    options: TestDataFactory.cliOptions()
      .withForce(true)
      .withNonInteractive(true)
      .build()
  }),
  act: ({ pack, options }) => packInstaller.install(pack, options),
  assert: (context, result) => {
    expect(result.success).toBe(true);
    expect(result.installedComponents).toEqual(context.pack.components.modes);
  }
});
```

### ErrorScenarios Integration

```typescript
// Combine with error testing
await TestPatterns.async.testRetry(async () => {
  // Use ErrorScenarios for consistent error simulation
  return await ErrorScenarios.filesystem.simulateNetworkError(
    () => packRegistry.fetchPack('remote-pack')
  );
}, maxRetries: 3);
```

### MockFactory Integration

```typescript
const scenario = await TestPatterns.organization.withCleanup(async (cleanup) => {
  const mockFs = MockFactory.fileSystem()
    .withFile('/config.json', '{"version": "1.0"}')
    .withError('/protected.txt', 'EACCES')
    .build();
  
  cleanup(() => mockFs.restore());
  
  return { mockFs };
});
```

## Best Practices

### 1. Choose the Right Pattern

- **AAA/GWT/SEV**: Use for unit and integration tests with clear phases
- **Table-driven**: Use when testing multiple similar scenarios
- **Property-based**: Use for testing invariants and edge cases
- **CLI patterns**: Use for command-line interface testing
- **Async patterns**: Use for concurrent operations and timing-sensitive tests
- **Performance patterns**: Use for benchmarking and regression detection

### 2. Test Organization

```typescript
describe('TicketManager', () => {
  // Use suites for shared setup
  TestPatterns.organization.suite(
    'CRUD Operations',
    async () => ({ manager: new TicketManager(testFs) }),
    async (context) => { await context.manager.cleanup(); },
    (context) => {
      // Individual tests here
    }
  );

  // Use table-driven for similar scenarios
  TestPatterns.table('validation scenarios', [
    { input: validTicket, expected: true },
    { input: invalidTicket, expected: false }
  ], (scenario) => {
    // Test logic here
  });
});
```

### 3. Error Handling

```typescript
// Always test both success and failure cases
await TestPatterns.aaa({
  arrange: () => ({ validInput: true }),
  act: (context) => operation(context.validInput),
  assert: (context, result) => expect(result).toBeDefined()
});

await TestPatterns.aaa({
  arrange: () => ({ invalidInput: null }),
  act: (context) => operation(context.invalidInput),
  assert: () => {
    // Should not reach here
    throw new Error('Expected operation to throw');
  }
}).catch(error => {
  expect(error.message).toMatch(/invalid input/i);
});
```

### 4. Performance Considerations

```typescript
// Benchmark critical operations
const benchmarkResults = await TestPatterns.performance.benchmark({
  operation: () => criticalOperation(),
  iterations: 1000,
  maxTime: 50 // Fail if slower than 50ms average
});

// Test under load
await TestPatterns.performance.loadTest(
  () => apiEndpoint(),
  concurrency: 100,
  duration: 60000,
  maxErrorRate: 0.01
);
```

### 5. Cleanup Management

```typescript
// Use automatic cleanup for resource management
await TestPatterns.organization.withCleanup(async (cleanup) => {
  const resources = await setupResources();
  cleanup(async () => await resources.dispose());
  
  // Test logic here
  return await runTest(resources);
});
```

### 6. Assertion Strategies

```typescript
// Use appropriate assertion level
TestPatterns.assertions.toMatchPartial(result, {
  // Only check what matters for this test
  status: 'success',
  data: { id: expect.any(String) }
});

// Use eventually for async conditions
await TestPatterns.assertions.eventually({
  assertion: () => backgroundTask.isComplete(),
  timeout: 30000,
  message: 'Background task should complete'
});
```

## Migration Guide

### From Manual Testing

```typescript
// Old way
describe('config manager', () => {
  let fs, configManager;
  
  beforeEach(async () => {
    fs = await createTestFileSystem({});
    configManager = new ConfigManager(fs);
  });
  
  it('should load config', async () => {
    const config = await configManager.load();
    expect(config).toBeDefined();
  });
});

// New way with TestPatterns
describe('config manager', () => {
  TestPatterns.organization.suite(
    'ConfigManager Tests',
    async () => ({
      fs: await createTestFileSystem({}),
      manager: new ConfigManager()
    }),
    async (context) => await context.fs.cleanup(),
    (context) => {
      it('should load config', async () => {
        await TestPatterns.aaa({
          arrange: () => context,
          act: (ctx) => ctx.manager.load(ctx.fs),
          assert: (ctx, result) => expect(result).toBeDefined()
        });
      });
    }
  );
});
```

### From Ad-hoc Async Testing

```typescript
// Old way
it('should handle concurrent operations', async () => {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(operation());
  }
  const results = await Promise.all(promises);
  expect(results.length).toBe(10);
});

// New way with TestPatterns
it('should handle concurrent operations', async () => {
  await TestPatterns.async.testConcurrent({
    operation,
    concurrency: 10,
    validator: (results) => results.length === 10
  });
});
```

This comprehensive testing pattern library provides a solid foundation for consistent, maintainable, and thorough testing across the Memento Protocol CLI codebase.