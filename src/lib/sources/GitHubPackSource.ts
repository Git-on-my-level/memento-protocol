import { RemotePackSource, RemotePackMetadata, RemotePackSourceConfig } from './RemotePackSource';
import { PackStructure } from '../types/packs';

export interface GitHubPackSourceConfig extends Omit<RemotePackSourceConfig, 'baseUrl'> {
  owner: string;
  repo: string;
  branch?: string;
  directory?: string;
  token?: string; // GitHub personal access token for private repos
}

export interface GitHubPackInfo {
  name: string;
  downloadUrl: string;
  sha: string;
  size: number;
}

export class GitHubPackSource extends RemotePackSource {
  private owner: string;
  private repo: string;
  private branch: string;
  private directory: string;
  private token?: string;
  private packListCache: string[] | null = null;
  private packListCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: GitHubPackSourceConfig) {
    const baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    super({
      ...config,
      baseUrl,
      name: config.name || `github:${config.owner}/${config.repo}`,
      description: config.description || `GitHub repository: ${config.owner}/${config.repo}`,
    });
    
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || 'main';
    this.directory = config.directory || 'packs';
    this.token = config.token;
    
    // Add GitHub API headers
    if (this.token) {
      this.config.headers = {
        ...this.config.headers,
        'Authorization': `token ${this.token}`,
      };
    }
    this.config.headers = {
      ...this.config.headers,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'zcc-pack-manager',
    };
  }

  async listPacks(): Promise<string[]> {
    // Check cache
    const now = Date.now();
    if (this.packListCache && (now - this.packListCacheTime) < this.CACHE_TTL) {
      return this.packListCache;
    }

    try {
      // Fetch directory contents from GitHub API
      const url = `${this.config.baseUrl}/contents/${this.directory}?ref=${this.branch}`;
      const response = await this.fetchWithTimeout(url);
      const contents = await response.json();
      
      if (!Array.isArray(contents)) {
        throw new Error('Invalid response from GitHub API');
      }
      
      // Filter for directories (each directory is a pack)
      const packs = contents
        .filter((item: any) => item.type === 'dir')
        .map((item: any) => item.name);
      
      // Update cache
      this.packListCache = packs;
      this.packListCacheTime = now;
      
      return packs;
    } catch (error: any) {
      throw new Error(`Failed to list packs from GitHub: ${error.message}`);
    }
  }

  async fetchPackMetadata(name: string): Promise<RemotePackMetadata> {
    // Check memory cache
    if (this.metadataCache.has(name)) {
      return this.metadataCache.get(name)!;
    }

    try {
      // Fetch manifest.json for the pack
      const manifestUrl = `${this.config.baseUrl}/contents/${this.directory}/${name}/manifest.json?ref=${this.branch}`;
      const response = await this.fetchWithTimeout(manifestUrl);
      const fileInfo = await response.json();
      
      if (!fileInfo.content) {
        throw new Error(`Manifest not found for pack ${name}`);
      }
      
      // Decode base64 content
      const manifestContent = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
      const manifest = JSON.parse(manifestContent);
      
      // Get pack archive URL (as tarball)
      const archiveUrl = `${this.config.baseUrl}/tarball/${this.branch}`;
      
      const metadata: RemotePackMetadata = {
        name: manifest.name || name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        url: archiveUrl,
        // Don't use checksum for GitHub sources since we're downloading full repo tarball
        // The SHA from manifest.json doesn't match the tarball SHA
        checksum: undefined,
        size: fileInfo.size,
        lastUpdated: fileInfo.last_modified || new Date().toISOString(),
      };
      
      // Cache metadata
      this.metadataCache.set(name, metadata);
      
      return metadata;
    } catch (error: any) {
      throw new Error(`Failed to fetch metadata for pack ${name}: ${error.message}`);
    }
  }

  async fetchPackContent(_metadata: RemotePackMetadata): Promise<Buffer> {
    try {
      // Use GitHub's tarball API to download the entire repository
      const archiveUrl = `${this.config.baseUrl}/tarball/${this.branch}`;
      const response = await this.fetchWithTimeout(archiveUrl);

      if (!response.ok) {
        throw new Error(`Failed to download archive: ${response.status} ${response.statusText}`);
      }

      // Get the raw tarball content
      const archiveBuffer = Buffer.from(await response.arrayBuffer());

      // We'll return the full tarball and let the parent class handle extraction
      // The extractPackContent method will extract only the pack directory we need
      return archiveBuffer;
    } catch (error: any) {
      throw new Error(`Failed to fetch pack content: ${error.message}`);
    }
  }

  // Override loadPack to pass pack name to saveToCache for proper extraction
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
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (hash !== metadata.checksum) {
        throw new Error(`Pack integrity check failed for ${name}`);
      }
    }

    // Save to cache and extract (pass pack name for GitHub extraction)
    const packPath = await this.saveToCache(name, content, metadata, name);
    const pack = await this.extractAndLoadPack(packPath, name);

    this.packCache.set(name, pack);
    return pack;
  }

  // Override saveToCache to pass pack name to extractPackContent
  protected async saveToCache(name: string, content: Buffer, metadata: RemotePackMetadata, packName?: string): Promise<string> {
    const cacheDir = this.join(this.cachePath, name);
    await this.mkdir(cacheDir, { recursive: true });

    // Save metadata
    const metadataPath = this.join(cacheDir, '.metadata.json');
    await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Extract pack content with pack name for GitHub-specific extraction
    await this.extractPackContent(content, cacheDir, packName);

    return cacheDir;
  }

  // Use helper methods that match the file system adapter pattern
  private async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(dirPath, options);
  }

  private async writeFile(filePath: string, data: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, data);
  }

  private join(...paths: string[]): string {
    const path = require('path');
    return path.join(...paths);
  }

  // GitHub-specific methods
  async getPackInfo(name: string): Promise<GitHubPackInfo | null> {
    try {
      const url = `${this.config.baseUrl}/contents/${this.directory}/${name}?ref=${this.branch}`;
      const response = await this.fetchWithTimeout(url);
      const contents = await response.json();
      
      if (!Array.isArray(contents)) {
        return null;
      }
      
      // Find manifest.json to get pack info
      const manifest = contents.find((item: any) => item.name === 'manifest.json');
      if (!manifest) {
        return null;
      }
      
      return {
        name,
        downloadUrl: manifest.download_url,
        sha: manifest.sha,
        size: contents.reduce((sum: number, item: any) => sum + (item.size || 0), 0),
      };
    } catch {
      return null;
    }
  }

  async getPackReadme(name: string): Promise<string | null> {
    try {
      const url = `${this.config.baseUrl}/contents/${this.directory}/${name}/README.md?ref=${this.branch}`;
      const response = await this.fetchWithTimeout(url);
      const fileInfo = await response.json();
      
      if (fileInfo.content) {
        return Buffer.from(fileInfo.content, 'base64').toString('utf-8');
      }
    } catch {
      // README is optional
    }
    return null;
  }

  async searchPacks(query: string): Promise<string[]> {
    const allPacks = await this.listPacks();
    const lowerQuery = query.toLowerCase();
    
    // Simple substring search for now
    return allPacks.filter(pack => 
      pack.toLowerCase().includes(lowerQuery)
    );
  }

  // Override to provide GitHub-specific source info
  getSourceInfo(): any {
    return {
      ...super.getSourceInfo(),
      type: 'github',
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      directory: this.directory,
    };
  }
}