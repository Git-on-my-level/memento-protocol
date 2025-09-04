import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

/**
 * Test utilities for filesystem operations and assertions.
 * 
 * This module provides helper functions to make filesystem testing easier
 * and more readable. It includes assertion helpers, file manipulation utilities,
 * and common test scenarios.
 */

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a file exists in the filesystem
 */
export async function assertFileExists(fs: FileSystemAdapter, path: string, message?: string): Promise<void> {
  const exists = await fs.exists(path);
  if (!exists) {
    throw new Error(message || `Expected file to exist: ${path}`);
  }
}

/**
 * Assert that a file does not exist in the filesystem
 */
export async function assertFileNotExists(fs: FileSystemAdapter, path: string, message?: string): Promise<void> {
  const exists = await fs.exists(path);
  if (exists) {
    throw new Error(message || `Expected file not to exist: ${path}`);
  }
}

/**
 * Assert that a directory exists in the filesystem
 */
export async function assertDirectoryExists(fs: FileSystemAdapter, path: string, message?: string): Promise<void> {
  try {
    const stats = await fs.stat(path);
    if (!stats.isDirectory()) {
      throw new Error(message || `Path exists but is not a directory: ${path}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(message || `Expected directory to exist: ${path}`);
    }
    throw error;
  }
}

/**
 * Assert that a file contains specific content
 */
export async function assertFileContains(fs: FileSystemAdapter, path: string, expectedContent: string, message?: string): Promise<void> {
  try {
    const actualContent = await fs.readFile(path, 'utf8') as string;
    if (!actualContent.includes(expectedContent)) {
      throw new Error(message || `File ${path} does not contain expected content.\nExpected to contain: "${expectedContent}"\nActual content: "${actualContent}"`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(message || `Cannot assert file content, file does not exist: ${path}`);
    }
    throw error;
  }
}

/**
 * Assert that a file has exact content
 */
export async function assertFileEquals(fs: FileSystemAdapter, path: string, expectedContent: string, message?: string): Promise<void> {
  try {
    const actualContent = await fs.readFile(path, 'utf8') as string;
    if (actualContent !== expectedContent) {
      throw new Error(message || `File ${path} content does not match.\nExpected: "${expectedContent}"\nActual: "${actualContent}"`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(message || `Cannot assert file content, file does not exist: ${path}`);
    }
    throw error;
  }
}

/**
 * Assert that a JSON file contains specific data
 */
export async function assertJsonFileContains(fs: FileSystemAdapter, path: string, expectedData: any, message?: string): Promise<void> {
  try {
    const content = await fs.readFile(path, 'utf8') as string;
    const actualData = JSON.parse(content);
    
    // Simple deep equality check for expected properties
    const checkContains = (actual: any, expected: any): boolean => {
      if (typeof expected !== 'object' || expected === null) {
        return actual === expected;
      }
      
      if (typeof actual !== 'object' || actual === null) {
        return false;
      }
      
      for (const key in expected) {
        if (!checkContains(actual[key], expected[key])) {
          return false;
        }
      }
      
      return true;
    };
    
    if (!checkContains(actualData, expectedData)) {
      throw new Error(message || `JSON file ${path} does not contain expected data.\nExpected to contain: ${JSON.stringify(expectedData, null, 2)}\nActual content: ${JSON.stringify(actualData, null, 2)}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(message || `Cannot assert JSON file content, file does not exist: ${path}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(message || `Cannot parse JSON file ${path}: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// File Manipulation Helpers
// ============================================================================

/**
 * Create a directory structure in the filesystem
 */
export async function createDirectoryStructure(fs: FileSystemAdapter, paths: string[]): Promise<void> {
  for (const path of paths) {
    await fs.mkdir(path, { recursive: true });
  }
}

/**
 * Create multiple files at once
 */
export async function createFiles(fs: FileSystemAdapter, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    // Ensure parent directory exists
    const dir = fs.dirname(path);
    if (dir !== '/' && dir !== path) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(path, content, { encoding: 'utf8' });
  }
}

/**
 * Create a JSON file with specific data
 */
export async function createJsonFile(fs: FileSystemAdapter, path: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(path, content, { encoding: 'utf8' });
}

/**
 * Read all files in a directory structure recursively
 */
export async function readDirectoryStructure(fs: FileSystemAdapter, rootPath: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  
  const readRecursively = async (currentPath: string): Promise<void> => {
    try {
      const stats = await fs.stat(currentPath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(currentPath, 'utf8') as string;
        result[currentPath] = content;
      } else if (stats.isDirectory()) {
        const entries = await fs.readdir(currentPath);
        for (const entry of entries) {
          const fullPath = fs.join(currentPath, entry);
          await readRecursively(fullPath);
        }
      }
    } catch (error: any) {
      // Skip files we can't read
      if (error.code !== 'ENOENT' && error.code !== 'EPERM') {
        console.warn(`Warning: Could not read ${currentPath}:`, error.message);
      }
    }
  };
  
  await readRecursively(rootPath);
  return result;
}

// ============================================================================
// Memory FileSystem Specific Helpers
// ============================================================================

/**
 * Populate a memory filesystem with files (only works with MemoryFileSystemAdapter)
 */
export function populateMemoryFileSystem(fs: FileSystemAdapter, files: Record<string, string>): void {
  if (fs instanceof MemoryFileSystemAdapter) {
    fs.populate(files);
  } else {
    throw new Error('populateMemoryFileSystem can only be used with MemoryFileSystemAdapter');
  }
}

/**
 * Get all files from a memory filesystem as JSON (only works with MemoryFileSystemAdapter)
 */
export function getMemoryFileSystemContents(fs: FileSystemAdapter): Record<string, string> {
  if (fs instanceof MemoryFileSystemAdapter) {
    return fs.toJSON();
  } else {
    throw new Error('getMemoryFileSystemContents can only be used with MemoryFileSystemAdapter');
  }
}

/**
 * Reset a memory filesystem to empty state (only works with MemoryFileSystemAdapter)
 */
export function resetMemoryFileSystem(fs: FileSystemAdapter): void {
  if (fs instanceof MemoryFileSystemAdapter) {
    fs.reset();
  } else {
    throw new Error('resetMemoryFileSystem can only be used with MemoryFileSystemAdapter');
  }
}

/**
 * Debug helper: print the current state of a memory filesystem
 */
export function debugMemoryFileSystem(fs: FileSystemAdapter, label: string = 'FileSystem'): void {
  if (fs instanceof MemoryFileSystemAdapter) {
    console.log(`\n=== ${label} Contents ===`);
    const contents = fs.toJSON();
    if (Object.keys(contents).length === 0) {
      console.log('(empty)');
    } else {
      for (const [path, content] of Object.entries(contents)) {
        console.log(`${path}: ${typeof content === 'string' ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : content}`);
      }
    }
    console.log('========================\n');
  } else {
    console.log(`\n=== ${label} ===`);
    console.log('(Real filesystem - cannot display contents)');
    console.log('==============\n');
  }
}

// ============================================================================
// Common Test Scenarios
// ============================================================================

/**
 * Setup a typical ZCC project structure for testing
 */
export async function setupMementoProjectStructure(fs: FileSystemAdapter, projectRoot: string = '/project'): Promise<void> {
  const directories = [
    fs.join(projectRoot, '.zcc'),
    fs.join(projectRoot, '.zcc', 'modes'),
    fs.join(projectRoot, '.zcc', 'workflows'),
    fs.join(projectRoot, '.zcc', 'tickets'),
    fs.join(projectRoot, '.zcc', 'tickets', 'next'),
    fs.join(projectRoot, '.zcc', 'tickets', 'in-progress'),
    fs.join(projectRoot, '.zcc', 'tickets', 'done'),
    fs.join(projectRoot, '.claude'),
    fs.join(projectRoot, '.claude', 'agents'),
    fs.join(projectRoot, '.claude', 'commands'),
    fs.join(projectRoot, 'src')
  ];
  
  await createDirectoryStructure(fs, directories);
  
  const files = {
    [fs.join(projectRoot, '.zcc', 'config.json')]: JSON.stringify({
      version: '1.0.0',
      theme: 'default',
      enableHooks: true
    }, null, 2),
    [fs.join(projectRoot, 'package.json')]: JSON.stringify({
      name: 'test-project',
      version: '1.0.0'
    }, null, 2),
    [fs.join(projectRoot, 'README.md')]: '# Test Project\n\nThis is a test project.'
  };
  
  await createFiles(fs, files);
}

/**
 * Create a sample ticket for testing
 */
export async function createSampleTicket(fs: FileSystemAdapter, projectRoot: string, ticketName: string, status: 'next' | 'in-progress' | 'done' = 'next'): Promise<string> {
  const ticketPath = fs.join(projectRoot, '.zcc', 'tickets', status, `${ticketName}.md`);
  const content = `# ${ticketName}

## Description
This is a sample ticket for testing purposes.

## Acceptance Criteria
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes
Created for testing.
`;
  
  await fs.writeFile(ticketPath, content, { encoding: 'utf8' });
  return ticketPath;
}

/**
 * Create a sample mode for testing
 */
export async function createSampleMode(fs: FileSystemAdapter, projectRoot: string, modeName: string): Promise<string> {
  const modePath = fs.join(projectRoot, '.zcc', 'modes', `${modeName}.md`);
  const content = `---
name: ${modeName}
description: A sample mode for testing
author: zcc
version: 1.0.0
tags: [test, sample]
---

# ${modeName.charAt(0).toUpperCase() + modeName.slice(1)} Mode

This is a sample mode created for testing purposes.

## Behavior
- Focus on testing functionality
- Provide clear feedback
- Maintain consistency

## Examples
You can use this mode to test various scenarios.
`;
  
  await fs.writeFile(modePath, content, { encoding: 'utf8' });
  return modePath;
}