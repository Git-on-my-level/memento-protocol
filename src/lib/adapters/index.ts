/**
 * Adapters for zcc
 * 
 * This module provides abstraction layers that enable:
 * - File system operations (testing with in-memory, production with Node.js)
 * - Consistent error handling and type safety
 * - Both synchronous and asynchronous operations
 */

// Core interface
export { FileSystemAdapter } from './FileSystemAdapter';

// Node.js file system adapter
export { NodeFileSystemAdapter } from './NodeFileSystemAdapter';

// In-memory file system adapter for testing
export {
  MemoryFileSystemAdapter
} from './MemoryFileSystemAdapter';

// Node.js file system adapter
export { nodeFileSystem } from './NodeFileSystemAdapter';

// Default export for convenience (Node.js file system)
export { nodeFileSystem as defaultFileSystem } from './NodeFileSystemAdapter';

