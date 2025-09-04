# Filesystem Adapters

This module provides filesystem adapters that enable consistent filesystem operations across different environments, particularly for testing with in-memory filesystems.

## Overview

The filesystem adapter pattern allows you to:
- Use the real filesystem in production (`NodeFileSystemAdapter`)
- Use an in-memory filesystem for testing (`MemoryFileSystemAdapter`)
- Switch between them seamlessly without changing your code

## Basic Usage

### Production (Real Filesystem)

```typescript
import { NodeFileSystemAdapter } from './adapters';

const fs = new NodeFileSystemAdapter();

// All operations work on the real filesystem
await fs.writeFile('/tmp/test.txt', 'Hello, World!');
const content = await fs.readFile('/tmp/test.txt', 'utf8');
console.log(content); // "Hello, World!"
```

### Testing (In-Memory Filesystem)

```typescript
import { MemoryFileSystemAdapter } from './adapters';

const fs = new MemoryFileSystemAdapter();

// All operations work in memory
await fs.writeFile('/test.txt', 'Hello, World!');
const content = await fs.readFile('/test.txt', 'utf8');
console.log(content); // "Hello, World!"
```

## Testing Utilities

The testing utilities make it easy to create isolated test environments:

```typescript
import { 
  createTestFileSystem, 
  createTestMementoProject,
  assertFileExists,
  createSampleTicket 
} from './testing';

describe('My feature', () => {
  let fs: MemoryFileSystemAdapter;

  beforeEach(async () => {
    // Create an isolated filesystem for each test
    fs = await createTestFileSystem({
      '/project/README.md': '# My Project',
      '/project/package.json': JSON.stringify({ name: 'my-project' })
    });
  });

  it('should create a new file', async () => {
    await fs.writeFile('/project/newfile.txt', 'New content');
    
    // Use assertion helpers
    await assertFileExists(fs, '/project/newfile.txt');
    await assertFileContains(fs, '/project/newfile.txt', 'New content');
  });

  it('should work with Memento project structure', async () => {
    const fs = await createTestMementoProject('/my-project');
    
    // Filesystem now has complete Memento structure
    await assertDirectoryExists(fs, '/my-project/.memento');
    await assertDirectoryExists(fs, '/my-project/.claude');
    
    // Create test data
    await createSampleTicket(fs, '/my-project', 'test-feature');
    await createSampleMode(fs, '/my-project', 'test-mode');
  });
});
```

## Advanced Usage

### Pre-populated Filesystems

```typescript
const fs = new MemoryFileSystemAdapter({
  '/project/.memento/config.json': JSON.stringify({ theme: 'dark' }),
  '/project/src/index.ts': 'console.log("Hello, Memento!");',
  '/project/README.md': '# My Memento Project'
});

// Files are immediately available
console.log(fs.existsSync('/project/README.md')); // true
```

### Dynamic Population

```typescript
const fs = new MemoryFileSystemAdapter();

// Add files after creation
fs.populate({
  '/config/app.json': JSON.stringify({ version: '1.0.0' }),
  '/data/users.csv': 'name,email\nJohn,john@example.com'
});

// Get all files for debugging
console.log(fs.toJSON());
// {
//   '/config/app.json': '{"version":"1.0.0"}',
//   '/data/users.csv': 'name,email\nJohn,john@example.com'
// }
```

### Complex Test Scenarios

```typescript
import { 
  createMultiProjectTestFileSystem,
  setupMementoProjectStructure,
  readDirectoryStructure 
} from './testing';

const fs = await createMultiProjectTestFileSystem({
  'frontend': {
    '/frontend/package.json': JSON.stringify({ name: 'frontend' }),
    '/frontend/src/App.tsx': 'export const App = () => <div>Frontend</div>;'
  },
  'backend': {
    '/backend/package.json': JSON.stringify({ name: 'backend' }),
    '/backend/src/server.ts': 'console.log("Backend server");'
  }
});

// Both projects exist in the same filesystem
expect(fs.existsSync('/frontend/package.json')).toBe(true);
expect(fs.existsSync('/backend/package.json')).toBe(true);
```

## API Reference

### FileSystemAdapter Interface

All adapters implement the same interface:

```typescript
interface FileSystemAdapter {
  // Async operations
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<Stats>;

  // Sync operations
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  writeFileSync(path: string, data: string | Buffer): void;
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer;
  readdirSync(path: string): string[];
  existsSync(path: string): boolean;
  statSync(path: string): Stats;

  // Path utilities
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
}
```

### MemoryFileSystemAdapter Specific Methods

The memory adapter provides additional methods:

```typescript
class MemoryFileSystemAdapter extends FileSystemAdapter {
  constructor(initialFiles?: Record<string, string>);
  
  // Memory-specific operations
  populate(files: Record<string, string>): void;
  toJSON(): Record<string, string>;
  reset(): void;
  getVolume(): Volume; // Access underlying memfs Volume
}
```

## Integration Examples

### Existing Codebase Migration

If you have existing code using Node.js fs directly, you can migrate incrementally:

```typescript
// Before
import * as fs from 'fs/promises';
import * as path from 'path';

class MyService {
  async saveConfig(config: any) {
    const configPath = path.join(this.configDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}

// After
import { FileSystemAdapter, NodeFileSystemAdapter } from './adapters';

class MyService {
  constructor(private fs: FileSystemAdapter = new NodeFileSystemAdapter()) {}
  
  async saveConfig(config: any) {
    const configPath = this.fs.join(this.configDir, 'config.json');
    await this.fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}

// Testing becomes easy
const service = new MyService(await createTestFileSystem());
```

### Memento Protocol Integration

This adapter system is designed to work seamlessly with Memento Protocol components:

```typescript
// Use in ZccCore or other components
class ZccCore {
  constructor(
    private projectRoot: string,
    private fs: FileSystemAdapter = new NodeFileSystemAdapter()
  ) {}
  
  async loadConfig() {
    const configPath = this.fs.join(this.projectRoot, '.memento', 'config.json');
    if (await this.fs.exists(configPath)) {
      const content = await this.fs.readFile(configPath, 'utf8') as string;
      return JSON.parse(content);
    }
    return {};
  }
}

// Easy testing
const fs = await createTestMementoProject('/test-project');
const core = new ZccCore('/test-project', fs);
```