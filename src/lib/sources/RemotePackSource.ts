import { IPackSource } from '../packs/PackSource';
import { PackStructure, LocalPackSource as LocalPackSourceInterface } from '../types/packs';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface RemotePackSourceConfig {
  baseUrl: string;
  name: string;
  description?: string;
  cachePath?: string;
  trustLevel?: 'trusted' | 'untrusted';
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RemotePackMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  url: string;
  checksum?: string;
  size?: number;
  lastUpdated?: string;
}

export abstract class RemotePackSource implements IPackSource {
  protected config: RemotePackSourceConfig;
  protected cachePath: string;
  protected packCache: Map<string, PackStructure> = new Map();
  protected metadataCache: Map<string, RemotePackMetadata> = new Map();

  constructor(config: RemotePackSourceConfig) {
    this.config = {
      ...config,
      trustLevel: config.trustLevel || 'untrusted',
      timeout: config.timeout || 30000,
    };
    this.cachePath = config.cachePath || path.join(process.cwd(), '.zcc', '.cache', 'packs');
  }

  abstract listPacks(): Promise<string[]>;
  abstract fetchPackMetadata(name: string): Promise<RemotePackMetadata>;
  abstract fetchPackContent(metadata: RemotePackMetadata): Promise<Buffer>;

  async loadPack(name: string): Promise<PackStructure> {
    // Check memory cache first
    if (this.packCache.has(name)) {
      return this.packCache.get(name)!;
    }

    // Check disk cache
    const cachedPack = await this.loadFromCache(name);
    if (cachedPack) {
      this.packCache.set(name, cachedPack);
      return cachedPack;
    }

    // Fetch from remote
    const metadata = await this.fetchPackMetadata(name);
    const content = await this.fetchPackContent(metadata);
    
    // Validate content integrity if checksum provided
    if (metadata.checksum) {
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (hash !== metadata.checksum) {
        throw new Error(`Pack integrity check failed for ${name}`);
      }
    }

    // Save to cache and extract
    const packPath = await this.saveToCache(name, content, metadata);
    const pack = await this.extractAndLoadPack(packPath, name);
    
    this.packCache.set(name, pack);
    return pack;
  }

  async hasPack(name: string): Promise<boolean> {
    const packs = await this.listPacks();
    return packs.includes(name);
  }

  getSourceInfo(): LocalPackSourceInterface {
    return {
      name: this.config.name,
      path: this.config.baseUrl,
      description: this.config.description,
      type: 'local', // Required by interface, but we extend with additional info
      ...({ type: 'remote', trustLevel: this.config.trustLevel } as any),
    } as any;
  }

  async getComponentPath(packName: string, componentType: string, componentName: string): Promise<string> {
    const pack = await this.loadPack(packName);
    const extension = componentType === 'hooks' ? 'json' : 'md';
    const componentPath = path.join(pack.path, componentType, `${componentName}.${extension}`);

    if (await this.fileExists(componentPath)) {
      return componentPath;
    }

    throw new Error(`Component ${componentName} not found in pack ${packName}`);
  }

  async hasComponent(packName: string, componentType: string, componentName: string): Promise<boolean> {
    try {
      await this.getComponentPath(packName, componentType, componentName);
      return true;
    } catch {
      return false;
    }
  }

  protected async loadFromCache(name: string): Promise<PackStructure | null> {
    const cacheDir = path.join(this.cachePath, name);
    const manifestPath = path.join(cacheDir, 'manifest.json');
    
    try {
      if (await this.fileExists(manifestPath)) {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        // Check cache validity (24 hours by default)
        const stats = await fs.stat(manifestPath);
        const age = Date.now() - stats.mtime.getTime();
        if (age > 24 * 60 * 60 * 1000) {
          // Cache expired, remove it
          await this.clearCache(name);
          return null;
        }
        
        return { manifest, path: cacheDir };
      }
    } catch (error) {
      // Cache read failed, return null to fetch fresh
      return null;
    }
    
    return null;
  }

  protected async saveToCache(name: string, content: Buffer, metadata: RemotePackMetadata): Promise<string> {
    const cacheDir = path.join(this.cachePath, name);
    await fs.mkdir(cacheDir, { recursive: true });

    // Save metadata
    const metadataPath = path.join(cacheDir, '.metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Extract pack content (assuming it's a tarball or zip)
    await this.extractPackContent(content, cacheDir, name);

    return cacheDir;
  }

  protected async extractPackContent(content: Buffer, targetDir: string, packName?: string): Promise<void> {
    // Extract tarball content to target directory
    const tar = await import('tar');
    const { Readable } = await import('stream');
    const path = await import('path');

    // If packName is provided, we need to extract only that specific directory
    // This handles GitHub sources where we download the full repo tarball
    if (packName) {
      // Create a temporary directory to extract the full archive
      const tempDir = path.join(targetDir, '..', `${packName}-temp-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // Extract full archive to temp directory
        const stream = Readable.from(content);
        await new Promise<void>((resolve, reject) => {
          stream.pipe(
            tar.x({
              cwd: tempDir,
              strip: 1, // Remove the GitHub repo root directory
            })
          )
          .on('finish', resolve)
          .on('error', reject);
        });

        // Find the pack directory (e.g., packs/packName)
        const packSourcePath = path.join(tempDir, 'packs', packName);
        if (!await this.fileExists(packSourcePath)) {
          throw new Error(`Pack directory 'packs/${packName}' not found in archive`);
        }

        // Copy the pack directory contents to target directory
        const entries = await fs.readdir(packSourcePath);
        for (const entry of entries) {
          const sourcePath = path.join(packSourcePath, entry);
          const destPath = path.join(targetDir, entry);

          const stats = await fs.stat(sourcePath);
          if (stats.isDirectory()) {
            await this.copyDirectory(sourcePath, destPath);
          } else {
            await fs.copyFile(sourcePath, destPath);
          }
        }
      } finally {
        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } else {
      // Simple extraction for other sources
      const stream = Readable.from(content);
      await new Promise<void>((resolve, reject) => {
        stream.pipe(
          tar.x({
            cwd: targetDir,
            strip: 1, // Remove top-level directory if present
          })
        )
        .on('finish', resolve)
        .on('error', reject);
      });
    }
  }

  protected async extractAndLoadPack(packPath: string, name: string): Promise<PackStructure> {
    const manifestPath = path.join(packPath, 'manifest.json');
    
    if (!await this.fileExists(manifestPath)) {
      throw new Error(`Manifest not found for pack ${name}`);
    }
    
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    return { manifest, path: packPath };
  }

  protected async clearCache(name?: string): Promise<void> {
    if (name) {
      const cacheDir = path.join(this.cachePath, name);
      if (await this.fileExists(cacheDir)) {
        await fs.rm(cacheDir, { recursive: true, force: true });
      }
      this.packCache.delete(name);
      this.metadataCache.delete(name);
    } else {
      // Clear all cache
      if (await this.fileExists(this.cachePath)) {
        await fs.rm(this.cachePath, { recursive: true, force: true });
      }
      this.packCache.clear();
      this.metadataCache.clear();
    }
  }

  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  protected async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });

    const entries = await fs.readdir(source);
    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const destPath = path.join(destination, entry);

      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  protected async fetchWithTimeout(url: string, options: any = {}): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout!);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Trust and security methods
  getTrustLevel(): 'trusted' | 'untrusted' {
    return this.config.trustLevel!;
  }

  isTrusted(): boolean {
    return this.config.trustLevel === 'trusted';
  }

  async validatePackSecurity(pack: PackStructure): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    // Check for suspicious patterns in manifest
    const manifest = pack.manifest;
    
    if (manifest.postInstall) {
      warnings.push('Pack contains post-install commands (currently disabled for security)');
    }
    
    if (manifest.hooks && manifest.hooks.length > 0) {
      warnings.push(`Pack registers ${manifest.hooks.length} hooks`);
    }
    
    // Additional security checks can be added here
    
    return {
      valid: warnings.length === 0 || this.isTrusted(),
      warnings,
    };
  }
}