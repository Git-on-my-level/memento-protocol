import { Volume } from 'memfs';
import { FileSystemAdapter } from './FileSystemAdapter';
import * as path from 'path';

/**
 * In-memory filesystem adapter using memfs for testing.
 * 
 * This adapter provides a fully functional filesystem that exists only in memory,
 * making it perfect for fast, isolated tests that don't touch the real filesystem.
 * 
 * Example:
 * ```typescript
 * const fsAdapter = new MemoryFileSystemAdapter();
 * await fsAdapter.writeFile('/test.txt', 'Hello World');
 * const content = await fsAdapter.readFile('/test.txt', 'utf8');
 * console.log(content); // "Hello World"
 * ```
 * 
 * You can also pre-populate the filesystem:
 * ```typescript
 * const fsAdapter = new MemoryFileSystemAdapter({
 *   '/project/.memento/config.json': '{"theme": "dark"}',
 *   '/project/src/index.ts': 'console.log("hello")'
 * });
 * ```
 */
export class MemoryFileSystemAdapter implements FileSystemAdapter {
  private vol: Volume;

  constructor(initialFiles: Record<string, string> = {}) {
    this.vol = Volume.fromJSON(initialFiles);
  }

  /**
   * Get the underlying memfs volume for advanced operations
   */
  getVolume(): Volume {
    return this.vol;
  }

  /**
   * Reset the filesystem to empty state
   */
  reset(): void {
    this.vol.reset();
  }

  /**
   * Add files to the filesystem (similar to Volume.fromJSON but additive)
   */
  populate(files: Record<string, string>): void {
    Object.entries(files).forEach(([filePath, content]) => {
      // Ensure parent directories exist
      const dir = path.dirname(filePath);
      if (dir !== '/' && !this.vol.existsSync(dir)) {
        this.vol.mkdirSync(dir, { recursive: true });
      }
      this.vol.writeFileSync(filePath, content);
    });
  }

  /**
   * Get all files as a JSON object (useful for debugging)
   */
  toJSON(): Record<string, string> {
    return this.vol.toJSON() as Record<string, string>;
  }

  // Async directory operations
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    this.vol.mkdirSync(path, options);
  }

  async rmdir(path: string): Promise<void> {
    // memfs doesn't have rm with recursive, so we'll simulate it
    try {
      if (this.vol.existsSync(path)) {
        const stat = this.vol.statSync(path);
        if (stat.isFile()) {
          // It's a file, use unlink
          this.vol.unlinkSync(path);
        } else if (stat.isDirectory()) {
          // It's a directory, remove recursively
          const entries = this.vol.readdirSync(path);
          for (const entry of entries) {
            const entryPath = this.join(path, entry.toString());
            await this.rmdir(entryPath); // Recursive call
          }
          this.vol.rmdirSync(path);
        }
      }
    } catch (error: any) {
      // If the directory doesn't exist, that's fine
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // Async file operations
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    if (encoding) {
      return this.vol.readFileSync(filePath, encoding) as string;
    }
    return this.vol.readFileSync(filePath) as Buffer;
  }

  async writeFile(filePath: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): Promise<void> {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (dir !== '/' && !this.vol.existsSync(dir)) {
      this.vol.mkdirSync(dir, { recursive: true });
    }
    
    this.vol.writeFileSync(filePath, data, options);
  }

  async unlink(path: string): Promise<void> {
    this.vol.unlinkSync(path);
  }

  // Async path operations
  async exists(path: string): Promise<boolean> {
    return this.vol.existsSync(path);
  }

  async stat(path: string) {
    return this.vol.statSync(path);
  }

  async readdir(path: string): Promise<string[]> {
    const entries = this.vol.readdirSync(path);
    return entries.map(entry => entry.toString());
  }

  async copyFile(src: string, dest: string): Promise<void> {
    const content = this.vol.readFileSync(src);
    // Ensure parent directory exists
    const dir = path.dirname(dest);
    if (dir !== '/' && !this.vol.existsSync(dir)) {
      this.vol.mkdirSync(dir, { recursive: true });
    }
    this.vol.writeFileSync(dest, content);
  }

  async chmod(path: string, _mode: number): Promise<void> {
    // memfs doesn't actually support chmod, so we'll just check if the file exists
    if (!this.vol.existsSync(path)) {
      throw new Error(`ENOENT: no such file or directory, chmod '${path}'`);
    }
    // In a real memory filesystem, we would store the mode, but for testing purposes
    // we'll just validate the file exists
    // Note: _mode parameter is intentionally unused in this test implementation
  }

  // Path utilities (delegate to Node.js path module)
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }

  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  // Synchronous versions (directly delegate to memfs volume)
  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    this.vol.mkdirSync(path, options);
  }

  readFileSync(filePath: string, encoding?: BufferEncoding): string | Buffer {
    if (encoding) {
      return this.vol.readFileSync(filePath, encoding) as string;
    }
    return this.vol.readFileSync(filePath) as Buffer;
  }

  writeFileSync(filePath: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): void {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (dir !== '/' && !this.vol.existsSync(dir)) {
      this.vol.mkdirSync(dir, { recursive: true });
    }
    
    this.vol.writeFileSync(filePath, data, options);
  }

  existsSync(path: string): boolean {
    return this.vol.existsSync(path);
  }

  statSync(path: string) {
    return this.vol.statSync(path);
  }

  readdirSync(path: string): string[] {
    const entries = this.vol.readdirSync(path);
    return entries.map(entry => entry.toString());
  }
}