/**
 * Jest setup file for filesystem-dependent tests
 * Sets up memory filesystem and common filesystem test utilities
 */

import { createTestFileSystem } from './createTestFileSystem';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

declare global {
  var testFileSystem: MemoryFileSystemAdapter;
  var createFreshFileSystem: () => Promise<MemoryFileSystemAdapter>;
  var resetTestFileSystem: () => void;
}

// Global filesystem instance for tests
let globalTestFs: MemoryFileSystemAdapter;

beforeAll(async () => {
  // Create initial filesystem
  globalTestFs = await createTestFileSystem();
  global.testFileSystem = globalTestFs;
});

beforeEach(() => {
  // Reset filesystem before each test
  if (globalTestFs) {
    // Clear all files
    const contents = globalTestFs.toJSON();
    Object.keys(contents).forEach(path => {
      if (globalTestFs.existsSync(path)) {
        try {
          if (globalTestFs.lstatSync(path).isDirectory()) {
            globalTestFs.rmSync(path, { recursive: true });
          } else {
            globalTestFs.unlinkSync(path);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  }
});

// Helper functions available in filesystem tests
global.createFreshFileSystem = async () => {
  return await createTestFileSystem();
};

global.resetTestFileSystem = () => {
  if (global.testFileSystem) {
    const contents = global.testFileSystem.toJSON();
    Object.keys(contents).forEach(path => {
      try {
        if (global.testFileSystem.existsSync(path)) {
          global.testFileSystem.unlinkSync(path);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  }
};