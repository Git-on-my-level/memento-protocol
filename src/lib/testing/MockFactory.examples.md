# MockFactory Usage Examples

This document provides practical examples of how to use the MockFactory to create consistent, maintainable mocks in your tests.

## Basic Usage

### Before: Manual Mock Setup
```typescript
// Old way - lots of boilerplate
jest.mock('fs');
jest.mock('inquirer');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

beforeEach(() => {
  jest.clearAllMocks();
  
  mockFs.readFileSync.mockReturnValue('{"version": "1.0.0"}');
  mockFs.existsSync.mockReturnValue(true);
  mockFs.writeFileSync.mockReturnValue();
  
  mockInquirer.prompt.mockResolvedValue({ confirm: true });
});
```

### After: Using MockFactory
```typescript
// New way - clean and declarative
import { MockFactory, setupMockFactory } from '../../lib/testing';

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
      .build();

    const mockLogger = MockFactory.logger().build();

    // Your test logic here...
  });
});
```

## Real-World Refactoring Example

### Before: init.test.ts (Original)
```typescript
import { initCommand } from "../init";
import * as fs from "fs";
import inquirer from "inquirer";

jest.mock("fs");
jest.mock("inquirer");
jest.mock("../../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Init Command', () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockInquirer: jest.Mocked<typeof inquirer>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.writeFileSync.mockImplementation(() => {});
    
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    mockInquirer.prompt.mockResolvedValue({ 
      confirm: true,
      mode: 'architect',
      name: 'test-project' 
    });
  });

  it('should initialize project structure', async () => {
    // Test logic...
  });
});
```

### After: Using MockFactory
```typescript
import { initCommand } from "../init";
import { MockFactory, MockPresets, setupMockFactory } from "../../lib/testing";

// Automatic setup and cleanup
setupMockFactory();

describe('Init Command', () => {
  it('should initialize project structure', async () => {
    // Clean, declarative mock setup
    const mockFs = MockFactory.fileSystem()
      .withDirectory('/project')
      .build();

    const mockInquirer = MockFactory.inquirer()
      .withConfirm(true)
      .withChoice('architect')
      .withInput('test-project')
      .build();

    const mockLogger = MockFactory.logger().build();

    // Test logic - mocks are ready to use
    // Your test assertions here...
  });

  it('should handle existing project', async () => {
    // Use presets for common scenarios
    const mockFs = MockPresets.mementoFileSystem('/project').build();
    const mockInquirer = MockPresets.interactiveSetup().build();
    const mockLogger = MockPresets.silentLogger().build();

    // Test logic...
  });
});
```

## Common Patterns

### File System Operations
```typescript
// Testing file reading/writing
const mockFs = MockFactory.fileSystem()
  .withFile('/package.json', '{"name": "test", "version": "1.0.0"}')
  .withFile('/README.md', '# Test Project')
  .withDirectory('/src')
  .withReadError('/protected.txt', new Error('Permission denied'))
  .build();

// Test file operations
expect(mockFs.existsSync('/package.json')).toBe(true);
expect(mockFs.readFileSync('/package.json')).toContain('"name": "test"');
expect(() => mockFs.readFileSync('/protected.txt')).toThrow('Permission denied');
```

### Interactive Prompts
```typescript
// Testing CLI interactions
const mockInquirer = MockFactory.inquirer()
  .withPromptSequence([
    { name: 'action', value: 'init' },
    { name: 'confirm', value: true },
    { name: 'projectName', value: 'my-project' },
    { name: 'template', value: 'typescript' }
  ])
  .build();

// Simulate user interaction flow
const step1 = await mockInquirer.prompt([]);
expect(step1).toEqual({ action: 'init' });

const step2 = await mockInquirer.prompt([]);
expect(step2).toEqual({ confirm: true });
```

### Command Execution
```typescript
// Testing shell command execution
const mockChildProcess = MockFactory.childProcess()
  .withSuccess('git status', ['On branch main', 'nothing to commit'])
  .withSuccess('npm install', ['added 5 packages'])
  .withFailure('npm test', 1, ['Tests failed: 2 failing'])
  .build();

// Test successful commands
const gitResult = mockChildProcess.execSync('git status');
expect(gitResult).toBe('On branch main\nnothing to commit');

// Test failing commands
expect(() => mockChildProcess.execSync('npm test')).toThrow('Command failed');
```

### Logging and Debugging
```typescript
// Testing with call tracking
const mockLogger = MockFactory.logger()
  .withTracking(true)
  .build();

// Your code that uses the logger
mockLogger.info('Starting process');
mockLogger.success('Process completed');

// Verify logging behavior
expect(mockLogger.info).toHaveBeenCalledWith('Starting process');

// Get detailed call history for debugging
const callHistory = MockFactory.getCallHistory('logger.');
expect(callHistory).toHaveLength(2);
expect(callHistory[0].method).toBe('logger.info');
expect(callHistory[0].args).toEqual(['Starting process']);
```

## Advanced Scenarios

### Complex Integration Test
```typescript
describe('Complete CLI Flow', () => {
  it('should handle full initialization workflow', async () => {
    // Setup multiple mocks that work together
    const mockFs = MockFactory.fileSystem()
      .withFiles({
        '/project/package.json': '{"name": "test-project"}',
        '/project/.git/config': '[core]\n    repositoryformatversion = 0'
      })
      .build();

    const mockChildProcess = MockFactory.childProcess()
      .withSuccess('git status', ['On branch main'])
      .withSuccess('npm install', ['dependencies installed'])
      .build();

    const mockInquirer = MockFactory.inquirer()
      .withPromptSequence([
        { name: 'confirm', value: true },
        { name: 'mode', value: 'architect' },
        { name: 'features', value: ['hooks', 'workflows'] }
      ])
      .build();

    // Run your CLI command
    // const result = await runCommand(['init', '--interactive']);

    // Verify the complete workflow
    expect(mockFs.existsSync('/project/package.json')).toBe(true);
    MockFactory.verifyMockCalls(mockChildProcess.execSync, [
      ['git status'],
      ['npm install']
    ]);

    // Check call history for debugging
    const history = MockFactory.getCallHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});
```

### Error Handling Test
```typescript
describe('Error Scenarios', () => {
  it('should handle file system errors gracefully', () => {
    const mockFs = MockFactory.fileSystem()
      .withReadError('/config.json', new Error('EACCES: permission denied'))
      .throwOnMissingFiles(true)
      .build();

    const mockLogger = MockFactory.logger()
      .shouldThrowOnError(false) // Don't throw, just log
      .build();

    // Test error handling
    expect(() => mockFs.readFileSync('/config.json')).toThrow('permission denied');
    expect(() => mockFs.readFileSync('/missing.txt')).toThrow('ENOENT');
  });
});
```

### Performance Testing
```typescript
describe('Performance Tests', () => {
  it('should handle large file operations efficiently', () => {
    const largeFiles: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) {
      largeFiles[`/files/file${i}.txt`] = `Content for file ${i}`;
    }

    const mockFs = MockFactory.fileSystem()
      .withFiles(largeFiles)
      .build();

    const startTime = Date.now();
    
    // Test operations on many files
    for (let i = 0; i < 1000; i++) {
      expect(mockFs.existsSync(`/files/file${i}.txt`)).toBe(true);
    }
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(100); // Should be fast
  });
});
```

## Migration Guide

### Step 1: Install MockFactory
```typescript
// Add to your test file
import { MockFactory, setupMockFactory } from '../../lib/testing';

// Add automatic setup
setupMockFactory();
```

### Step 2: Replace Manual Mocks
```typescript
// Replace this:
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;
mockFs.existsSync.mockReturnValue(true);
mockFs.readFileSync.mockReturnValue('content');

// With this:
const mockFs = MockFactory.fileSystem()
  .withFile('/path/to/file', 'content')
  .build();
```

### Step 3: Use Presets for Common Scenarios
```typescript
// Instead of setting up the same mocks repeatedly
const mockFs = MockPresets.mementoFileSystem('/project').build();
const mockInquirer = MockPresets.interactiveSetup().build();
const mockLogger = MockPresets.silentLogger().build();
```

### Step 4: Leverage Call Tracking
```typescript
// Add debugging capabilities
const history = MockFactory.getCallHistory();
console.log('Mock calls:', history);

// Verify specific interactions
MockFactory.verifyMockCalls(mockFunction, expectedCalls);
```

## Best Practices

1. **Use setupMockFactory()** - Ensures clean state between tests
2. **Use Presets** - For common scenarios like Memento projects
3. **Builder Pattern** - Chain configuration methods for readability
4. **Call Tracking** - Use for debugging and verification
5. **Error Scenarios** - Test error handling with controlled failures
6. **Integration Tests** - Combine multiple mocks for realistic scenarios

## Troubleshooting

### Mock Not Working?
```typescript
// Check if mock was created correctly
const mockFs = MockFactory.fileSystem().build();
console.log('Mock methods:', Object.keys(mockFs));

// Verify call tracking
const history = MockFactory.getCallHistory();
console.log('Calls made:', history);
```

### State Pollution Between Tests?
```typescript
// Ensure you're using setupMockFactory
setupMockFactory();

// Or manually reset in beforeEach
beforeEach(() => {
  MockFactory.reset();
});
```

### Complex Scenarios Not Working?
```typescript
// Use call history to debug
const history = MockFactory.getCallHistory();
history.forEach(call => {
  console.log(`${call.method} called with:`, call.args);
});
```