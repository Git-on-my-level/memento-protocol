# Testing Utilities for Memento Protocol CLI

A comprehensive testing infrastructure for the Memento Protocol CLI, featuring test categorization, mock management, filesystem utilities, and error scenario testing.

## Core Components

### 1. MockFactory - Comprehensive Mock Management
### 2. TestCategories System - Test Organization and Categorization  
### 3. FileSystem Testing Utilities - Memory filesystem and assertions
### 4. Error Scenarios Framework - Structured error testing
### 5. Test Data Factory - Consistent test data generation

---

# MockFactory - Comprehensive Mock Management

A centralized factory for creating and managing test mocks with consistent, reusable patterns. Reduces boilerplate and provides fluent builder APIs for all common dependencies.

## Quick Start

```typescript
import { MockFactory, MockPresets, setupMockFactory } from '@/lib/testing';

// Automatic setup and cleanup
setupMockFactory();

describe('My Component', () => {
  it('should handle file operations', () => {
    const mockFs = MockFactory.fileSystem()
      .withFile('/config.json', '{"version": "1.0.0"}')
      .withDirectory('/src')
      .build();

    const mockInquirer = MockFactory.inquirer()
      .withConfirm(true)
      .withChoice('architect')
      .build();

    const mockLogger = MockFactory.logger().build();

    // Your test logic here...
  });
});
```

## Core Mock Builders

### File System Mock
```typescript
const mockFs = MockFactory.fileSystem()
  .withFile('/package.json', '{"name": "test"}')
  .withDirectory('/src')
  .withReadError('/protected.txt', new Error('Permission denied'))
  .withFiles({
    '/README.md': '# My Project',
    '/src/index.ts': 'export const app = {};'
  })
  .throwOnMissingFiles(true)
  .build();
```

### Interactive Prompts Mock
```typescript
const mockInquirer = MockFactory.inquirer()
  .withPromptSequence([
    { name: 'confirm', value: true },
    { name: 'mode', value: 'architect' },
    { name: 'features', value: ['hooks', 'workflows'] }
  ])
  .withConfirm(true)
  .withChoice('option1')
  .withInput('user-input')
  .build();
```

### Logger Mock
```typescript
const mockLogger = MockFactory.logger()
  .withTracking(true)  // Enable call tracking
  .shouldThrowOnError(false)  // Don't throw on logger.error()
  .build();
```

### Child Process Mock
```typescript
const mockChildProcess = MockFactory.childProcess()
  .withSuccess('git status', ['On branch main', 'nothing to commit'])
  .withFailure('npm test', 1, ['Tests failed'])
  .withCommand('custom-cmd', {
    exitCode: 0,
    stdout: ['Success!'],
    stderr: [],
    delay: 100
  })
  .build();
```

### Commander CLI Mock
```typescript
const mockCommand = MockFactory.commander()
  .withOption('force', true)
  .withOption('verbose', false)
  .withArgs(['file1', 'file2'])
  .withName('test-command')
  .build();
```

## Mock Presets for Common Scenarios

```typescript
// Memento project structure
const mockFs = MockPresets.mementoFileSystem('/project').build();

// Interactive setup flow
const mockInquirer = MockPresets.interactiveSetup().build();

// Silent logger for tests
const mockLogger = MockPresets.silentLogger().build();

// Successful command execution
const mockChildProcess = MockPresets.successfulCommands().build();
```

## Mock State Management

```typescript
// Track all mock calls for debugging
const history = MockFactory.getCallHistory();
console.log('All mock calls:', history);

// Filter calls by method
const fsHistory = MockFactory.getCallHistory('fs.');
const loggerHistory = MockFactory.getCallHistory('logger.');

// Verify specific mock behavior
MockFactory.verifyMockCalls(mockFunction, [
  ['expected', 'first', 'call'],
  ['expected', 'second', 'call']
]);

// Assert mock was not called
MockFactory.assertMockNotCalled(mockFunction);

// Reset all mocks (done automatically with setupMockFactory)
MockFactory.reset();
```

## Advanced Features

### Error Scenario Testing
```typescript
const mockFs = MockFactory.fileSystem()
  .withReadError('/protected.txt', new Error('EACCES: permission denied'))
  .throwOnMissingFiles(true)
  .build();

expect(() => mockFs.readFileSync('/protected.txt')).toThrow('permission denied');
expect(() => mockFs.readFileSync('/missing.txt')).toThrow('ENOENT');
```

### Async Operations with Delays
```typescript
const mockInquirer = MockFactory.inquirer()
  .withPrompt('slow', 'result', 1000)  // 1 second delay
  .build();

const mockChildProcess = MockFactory.childProcess()
  .withCommand('slow-cmd', {
    exitCode: 0,
    stdout: ['Done'],
    delay: 500  // 500ms delay
  })
  .build();
```

### Complex Integration Tests
```typescript
describe('Full CLI Workflow', () => {
  it('should handle complete initialization', async () => {
    // Setup multiple coordinated mocks
    const mockFs = MockPresets.mementoFileSystem('/project').build();
    const mockInquirer = MockPresets.interactiveSetup().build();
    const mockChildProcess = MockPresets.successfulCommands().build();
    const mockLogger = MockFactory.logger().build();

    // Run your CLI command
    // Verify the complete workflow worked
    expect(mockFs.existsSync('/project/.memento/config.json')).toBe(true);
    
    const history = MockFactory.getCallHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});
```

### Mock Verification and Debugging
```typescript
// Get detailed call information
const history = MockFactory.getCallHistory();
history.forEach(call => {
  console.log(`${call.method} called at ${call.timestamp}`);
  console.log('Arguments:', call.args);
  if (call.result) console.log('Result:', call.result);
  if (call.error) console.log('Error:', call.error);
});

// Verify complex interaction patterns
MockFactory.verifyMockCalls(mockLogger.info, [
  ['Starting process'],
  ['Processing file: config.json'],
  ['Process completed successfully']
]);
```

---

# TestCategories System

A comprehensive test organization and categorization system for the Memento Protocol CLI. This system provides TypeScript decorators, filters, and utilities for organizing tests by type, speed, dependencies, and execution environment.

## Features

- **Test Categorization**: Organize tests by type (unit, integration, e2e, performance, regression, smoke)
- **Speed Classification**: Automatic and manual speed categorization (fast, normal, slow, very-slow)
- **Dependency Tracking**: Track test dependencies (isolated, filesystem, database, network, external, docker, gpu)
- **Environment Controls**: Environment-specific test execution and filtering
- **Performance Monitoring**: Track test execution times and identify slow/flaky tests
- **Jest Integration**: Custom matchers, reporters, and configuration helpers
- **Conditional Execution**: Skip or run tests based on environment, speed, or other criteria

## Basic Usage

### Categorizing Tests with Decorators

```typescript
import { TestCategories } from '@/lib/testing';

// Unit test - fast and isolated
@TestCategories.unit()
@TestCategories.fast()
@TestCategories.isolated()
describe('ComponentBuilder', () => {
  it('should build components correctly', () => {
    // Fast, isolated unit test
  });
});

// Integration test with filesystem dependency
@TestCategories.integration()
@TestCategories.slow()
@TestCategories.filesystem()
describe('FileManager Integration', () => {
  it('should handle file operations', () => {
    // Integration test that touches filesystem
  });
});

// Performance test
@TestCategories.performance()
@TestCategories.verySlow()
@TestCategories.isolated()
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', () => {
    // Performance benchmark test
  });
});
```

### Conditional Test Execution

```typescript
// Skip slow tests unless explicitly enabled
TestCategories.skipIfSlow(() => {
  describe('Expensive Operations', () => {
    it('should process large files', () => {
      // Only runs when JEST_SLOW_TESTS=true
    });
  });
});

// Environment-specific tests
TestCategories.onlyInEnvironment('ci', () => {
  describe('CI-only tests', () => {
    it('should test deployment pipeline', () => {
      // Only runs in CI environment
    });
  });
});

// Time-limited tests
TestCategories.timeLimit(5000, () => {
  it('should complete within 5 seconds', () => {
    // Warns if test takes longer than 5 seconds
  });
});
```

### Test Metadata and Tagging

```typescript
// Advanced categorization with metadata
@TestCategories.categorize({
  categories: ['integration'],
  speed: 'slow',
  dependencies: ['database', 'network'],
  environment: ['dev', 'staging'],
  priority: 'high',
  tags: ['api', 'auth'],
  timeout: 30000,
  retries: 2
})
describe('API Integration Tests', () => {
  // Tests inherit the metadata
});

// Mark flaky tests
@TestCategories.flaky('Known flaky due to network timing')
@TestCategories.retries(3)
describe('Network Tests', () => {
  it('should handle network requests', () => {
    // Will retry up to 3 times if it fails
  });
});
```

## Test Categories

### By Type
- **unit**: Fast, isolated tests of individual components
- **integration**: Tests that verify component interactions
- **e2e**: End-to-end tests of complete user workflows
- **performance**: Benchmarks and performance tests
- **regression**: Tests that prevent known issues from returning
- **smoke**: Critical path tests that verify basic functionality

### By Speed
- **fast**: Tests completing in <100ms
- **normal**: Tests completing in 100ms-1s
- **slow**: Tests completing in 1s-5s
- **very-slow**: Tests completing in >5s

### By Dependencies
- **isolated**: No external dependencies
- **filesystem**: Requires filesystem access
- **database**: Requires database connection
- **network**: Requires network access
- **external**: Requires external services
- **docker**: Requires Docker containers
- **gpu**: Requires GPU acceleration

## Running Categorized Tests

### Environment Variables

```bash
# Enable/disable test types
export JEST_UNIT_TESTS=true
export JEST_INTEGRATION_TESTS=false
export JEST_PERFORMANCE_TESTS=false
export JEST_E2E_TESTS=false
export JEST_SLOW_TESTS=true

# Filter by specific criteria
export JEST_CATEGORY=unit
export JEST_SPEED=fast
export JEST_DEPENDENCY=isolated

# Reporting options
export JEST_GENERATE_CATEGORY_REPORT=true
export JEST_CATEGORY_REPORT_FILE=./test-report.txt
export JEST_CATEGORY_JSON_REPORT=./test-report.json
```

### Command Line Examples

```bash
# Run only unit tests
npx jest --testNamePattern="\\[unit\\]"

# Run fast tests only
npx jest --testNamePattern="\\[fast\\]"

# Run isolated tests (no dependencies)
npx jest --testNamePattern="\\[isolated\\]"

# Run with category-specific configuration
npx jest --config src/lib/testing/jest.config.categories.js

# Generate detailed category report
JEST_GENERATE_CATEGORY_REPORT=true npx jest

# Run specific category with custom timeout
JEST_CATEGORY=performance JEST_SPEED=very-slow npx jest --config src/lib/testing/jest.config.categories.js
```

### Programmatic Configuration

```typescript
import { JestTestCategories } from '@/lib/testing';

// Create configuration for specific categories
const unitConfig = JestTestCategories.getConfigForCategories(['unit']);
const fastConfig = JestTestCategories.getConfigForSpeed('fast');
const isolatedConfig = JestTestCategories.getConfigForDependencies(['isolated']);

// Create filtered configuration
const customConfig = JestTestCategories.createFilteredConfig({
  categories: ['unit', 'integration'],
  speeds: ['fast', 'normal'],
  maxExecutionTime: 5000,
  includeFlaky: false
});
```

## Test Filtering and Reporting

### Programmatic Filtering

```typescript
import { TestCategories } from '@/lib/testing';

// Get tests by category
const unitTests = TestCategories.getFilteredTests({ 
  categories: ['unit'] 
});

// Get fast, isolated tests
const quickTests = TestCategories.getFilteredTests({
  speeds: ['fast'],
  dependencies: ['isolated'],
  includeFlaky: false
});

// Get tests by multiple criteria
const specificTests = TestCategories.getFilteredTests({
  categories: ['unit', 'integration'],
  tags: ['core'],
  maxExecutionTime: 1000
});
```

### Statistics and Reporting

```typescript
// Get comprehensive statistics
const stats = TestCategories.getStatistics();
console.log(`Total tests: ${stats.totalTests}`);
console.log(`Unit tests: ${stats.byCategory.unit}`);
console.log(`Fast tests: ${stats.bySpeed.fast}`);
console.log(`Flaky tests: ${stats.flakyCount}`);

// Generate readable report
const report = TestCategories.generateReport();
console.log(report);

// Group tests by suite or category
const bySuite = TestCategories.groupBySuite();
const byCategory = TestCategories.groupByCategory();
```

## Jest Integration

### Custom Matchers

```typescript
// Test-specific matchers
expect(test).toBeCategory('unit');
expect(test).toHaveSpeed('fast');
expect(test).toHaveDependency('isolated');
```

### Setup Files

The system provides setup files for different test types:

- `jest-setup-categories.ts`: Core categorization setup
- `jest-setup-filesystem.ts`: Memory filesystem for filesystem tests
- `jest-setup-database.ts`: Mock database for database tests

### Custom Reporter

The included `category-reporter.js` generates detailed reports:

```bash
# Enable the custom reporter
JEST_GENERATE_CATEGORY_REPORT=true npx jest --reporters=default --reporters=src/lib/testing/category-reporter.js
```

## Best Practices

### Test Organization

1. **Always categorize tests**: Use at least one category decorator
2. **Be specific with dependencies**: Accurately declare what your test needs
3. **Use appropriate timeouts**: Set realistic timeouts for different test types
4. **Tag related tests**: Use tags to group related functionality
5. **Mark flaky tests**: Don't let flaky tests hide real issues

### Performance

1. **Run fast tests frequently**: Keep the feedback loop short
2. **Isolate slow tests**: Run performance tests separately
3. **Monitor execution times**: Use the reporting to identify slowdowns
4. **Parallelize appropriately**: Some tests need serial execution

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: JEST_CATEGORY=unit npm test
  
- name: Run Integration Tests
  run: JEST_CATEGORY=integration JEST_SLOW_TESTS=true npm test
  if: github.event_name == 'pull_request'
  
- name: Run Performance Tests
  run: JEST_CATEGORY=performance npm test
  if: github.ref == 'refs/heads/main'
```

## Migration Guide

### From Existing Tests

1. **Add category decorators** to existing test suites
2. **Identify dependencies** and add appropriate decorators
3. **Measure current speeds** and categorize accordingly
4. **Update CI/CD** to use category-based test runs
5. **Generate baseline reports** to track improvements

### Example Migration

```typescript
// Before
describe('ComponentBuilder', () => {
  it('should build components', () => { /* ... */ });
});

// After
@TestCategories.unit()
@TestCategories.fast()
@TestCategories.isolated()
describe('ComponentBuilder', () => {
  it('[unit][fast][isolated] should build components', () => { /* ... */ });
});
```

## Advanced Features

### Automatic Speed Classification

Tests are automatically classified by speed based on execution time:
- Fast: <100ms
- Normal: 100ms-1s  
- Slow: 1s-5s
- Very Slow: >5s

### Flaky Test Detection

The system tracks test execution history and can identify potentially flaky tests based on inconsistent results.

### Memory and Performance Monitoring

Test executions include memory usage tracking and performance metrics for identifying resource-intensive tests.

### Custom Test Environments

Create environment-specific test configurations:

```typescript
TestCategories.environment('staging')
describe('Staging Environment Tests', () => {
  // Only runs in staging environment
});
```

This comprehensive system helps maintain test organization, improves CI/CD efficiency, and provides valuable insights into test suite performance and reliability.