import { Stats } from 'fs';

/**
 * Abstraction layer for filesystem operations to enable testing with mocked filesystems.
 * 
 * This interface provides a consistent API that can be implemented by both real filesystem
 * adapters and in-memory test adapters (using memfs or similar).
 * 
 * Example usage:
 * ```typescript
 * // Production code
 * const fs = new NodeFileSystemAdapter();
 * 
 * // Test code
 * const fs = await createTestFileSystem({
 *   '/project/.memento/config.json': '{"theme": "dark"}',
 *   '/project/src/index.ts': 'console.log("hello")'
 * });
 * ```
 */
export interface FileSystemAdapter {
  // Directory operations
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rmdir(path: string): Promise<void>;
  
  // File operations
  readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  writeFile(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): Promise<void>;
  unlink(path: string): Promise<void>;
  
  // Path operations
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<Stats>;
  
  // Directory listing
  readdir(path: string): Promise<string[]>;
  
  // File utilities
  copyFile(src: string, dest: string): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  
  // Path utilities
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
  
  // Synchronous versions for compatibility with existing code
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer;
  writeFileSync(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): void;
  existsSync(path: string): boolean;
  statSync(path: string): Stats;
  readdirSync(path: string): string[];
}