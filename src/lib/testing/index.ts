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