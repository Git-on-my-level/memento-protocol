import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { FileSystemAdapter } from './FileSystemAdapter';

/**
 * Real filesystem adapter using Node.js fs module.
 * 
 * This adapter provides access to the actual filesystem and is used in production.
 * 
 * Example:
 * ```typescript
 * const fsAdapter = new NodeFileSystemAdapter();
 * await fsAdapter.writeFile('/tmp/test.txt', 'Hello World');
 * const content = await fsAdapter.readFile('/tmp/test.txt', 'utf8');
 * ```
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  // Async directory operations
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.mkdir(path, options);
  }

  async rmdir(path: string): Promise<void> {
    await fs.rm(path, { recursive: true, force: true });
  }

  // Async file operations
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    if (encoding) {
      return await fs.readFile(filePath, encoding);
    }
    return await fs.readFile(filePath);
  }

  async writeFile(filePath: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): Promise<void> {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (dir !== '/' && dir !== filePath) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    await fs.writeFile(filePath, data, options);
  }

  async unlink(path: string): Promise<void> {
    await fs.unlink(path);
  }

  // Async path operations
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string) {
    return await fs.stat(path);
  }

  async readdir(path: string): Promise<string[]> {
    const entries = await fs.readdir(path);
    return entries.map(entry => entry.toString());
  }

  async copyFile(src: string, dest: string): Promise<void> {
    await fs.copyFile(src, dest);
  }

  async chmod(path: string, mode: number): Promise<void> {
    await fs.chmod(path, mode);
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

  // Synchronous versions
  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fsSync.mkdirSync(path, options);
  }

  readFileSync(filePath: string, encoding?: BufferEncoding): string | Buffer {
    if (encoding) {
      return fsSync.readFileSync(filePath, encoding);
    }
    return fsSync.readFileSync(filePath);
  }

  writeFileSync(filePath: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): void {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (dir !== '/' && dir !== filePath) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
    
    fsSync.writeFileSync(filePath, data, options);
  }

  existsSync(path: string): boolean {
    return fsSync.existsSync(path);
  }

  statSync(path: string) {
    return fsSync.statSync(path);
  }

  readdirSync(path: string): string[] {
    return fsSync.readdirSync(path) as string[];
  }
}

/**
 * Default instance of NodeFileSystemAdapter for convenience
 */
export const nodeFileSystem = new NodeFileSystemAdapter();