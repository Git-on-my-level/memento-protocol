/**
 * Testing utilities for Memento Protocol
 * 
 * This module provides comprehensive testing utilities for working with filesystems
 * in tests, including in-memory filesystem adapters and assertion helpers.
 * 
 * @example
 * ```typescript
 * import { 
 *   createTestFileSystem, 
 *   assertFileExists, 
 *   createSampleTicket 
 * } from '@/lib/testing';
 * 
 * // Create an in-memory filesystem for testing
 * const fs = await createTestFileSystem({
 *   '/project/README.md': '# My Project'
 * });
 * 
 * // Test that files exist
 * await assertFileExists(fs, '/project/README.md');
 * 
 * // Create test data
 * await createSampleTicket(fs, '/project', 'test-ticket');
 * ```
 */

// File system adapters
export { FileSystemAdapter } from '../adapters/FileSystemAdapter';
export { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';
export { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

// Test filesystem creation utilities
export { 
  createTestFileSystem, 
  createTestMementoProject, 
  createMultiProjectTestFileSystem 
} from './createTestFileSystem';

// Test assertion and manipulation utilities
export {
  // Assertion helpers
  assertFileExists,
  assertFileNotExists,
  assertDirectoryExists,
  assertFileContains,
  assertFileEquals,
  assertJsonFileContains,
  
  // File manipulation helpers
  createDirectoryStructure,
  createFiles,
  createJsonFile,
  readDirectoryStructure,
  
  // Memory filesystem specific helpers
  populateMemoryFileSystem,
  getMemoryFileSystemContents,
  resetMemoryFileSystem,
  debugMemoryFileSystem,
  
  // Common test scenarios
  setupMementoProjectStructure,
  createSampleTicket,
  createSampleMode
} from './fileSystemTestUtils';

// Test data factory for building test data consistently
export { 
  TestDataFactory,
  ComponentBuilder,
  PackBuilder,
  ConfigBuilder,
  TicketBuilder,
  HookBuilder,
  CliOptionsBuilder,
  PackValidationResultBuilder,
  PackInstallationResultBuilder,
  PackDependencyResultBuilder
} from './TestDataFactory';

// Error scenario testing framework
export { ErrorScenarios } from './ErrorScenarios';

// Test categorization and organization system
export { 
  TestCategories, 
  TestRegistry, 
  JestTestCategories,
  type TestMetadata,
  type TestCategory,
  type TestSpeed,
  type TestDependency,
  type TestEnvironment,
  type TestPriority,
  type TestFilter,
  type TestSuiteInfo,
  type TestInfo,
  type TestExecution
} from './TestCategories';

// Comprehensive mock factory for consistent mocking
export {
  MockFactory,
  FileSystemMockBuilder,
  InquirerMockBuilder,
  LoggerMockBuilder,
  ChildProcessMockBuilder,
  CommanderMockBuilder,
  AxiosMockBuilder,
  MockPresets,
  setupMockFactory,
  type MockCallInfo,
  type FileSystemFile,
  type FileSystemMockConfig,
  type InquirerPromptResponse,
  type ChildProcessMockConfig,
  type MockState
} from './MockFactory';

// Comprehensive testing patterns for standardized test scenarios
export {
  TestPatterns,
  aaa,
  gwt,
  sev,
  table,
  property,
  cli,
  fs as fsPatterns,
  asyncPatterns,
  integration,
  performance,
  assertions,
  organization,
  createTestContext,
  TestScenarios,
  type TestContext,
  type AAAPattern,
  type GWTPattern,
  type SEVPattern,
  type TableTestScenario,
  type CLITestConfig,
  type InteractiveStep,
  type AsyncTestConfig,
  type PerformanceTestConfig,
  type EventuallyConfig
} from './TestPatterns';