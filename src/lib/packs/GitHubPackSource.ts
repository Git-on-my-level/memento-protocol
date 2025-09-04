/**
 * GitHub-specific pack source with API integration and smart URL handling
 */

import { IPackSource } from "./PackSource";
import { 
  PackManifest, 
  PackStructure, 
  GitHubPackSource as GitHubPackSourceInterface,
  RemotePackCache,
  LocalPackSource as LocalPackSourceInterface
} from "../types/packs";
import { HttpAdapter, NodeHttpAdapter, HttpError } from "../adapters/HttpAdapter";
import { logger } from "../logger";
import { ZccError } from "../errors";

export class GitHubPackSource implements IPackSource {
  private readonly sourceInfo: GitHubPackSourceInterface;
  private readonly http: HttpAdapter;
  private readonly cache: RemotePackCache;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly branch: string;

  constructor(sourceInfo: GitHubPackSourceInterface, http?: HttpAdapter) {
    this.sourceInfo = sourceInfo;
    this.http = http || new NodeHttpAdapter();
    this.branch = sourceInfo.branch || 'main';
    this.cache = {
      manifestCache: new Map(),
      componentCache: new Map()
    };
  }

  async loadPack(name: string): Promise<PackStructure> {
    logger.debug(`Loading pack '${name}' from GitHub: ${this.sourceInfo.owner}/${this.sourceInfo.repo}`);

    // Check cache first
    const cacheKey = `${name}:manifest`;
    const cachedManifest = this.cache.manifestCache.get(cacheKey);
    
    if (cachedManifest && !this.isCacheExpired(cachedManifest)) {
      logger.debug(`Using cached manifest for pack '${name}'`);
      return {
        manifest: cachedManifest.manifest,
        path: this.getPackPath(name),
        componentsPath: this.getComponentsPath(name)
      };
    }

    try {
      // Try GitHub API first for better rate limiting and reliability
      const manifest = await this.fetchManifestViaApi(name);
      
      // Cache the manifest
      const ttl = this.sourceInfo.cacheTtl || this.DEFAULT_CACHE_TTL;
      this.cache.manifestCache.set(cacheKey, {
        manifest,
        timestamp: Date.now(),
        ttl
      });

      logger.debug(`Successfully loaded pack '${name}' from GitHub`);

      return {
        manifest,
        path: this.getPackPath(name),
        componentsPath: this.getComponentsPath(name)
      };

    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }

      if (error instanceof HttpError) {
        if (error.status === 404) {
          throw new ZccError(
            `Pack '${name}' not found in GitHub repository`,
            'PACK_NOT_FOUND',
            `Repository: ${this.sourceInfo.owner}/${this.sourceInfo.repo}, Branch: ${this.branch}`
          );
        }
        
        throw new ZccError(
          `Failed to fetch pack '${name}' from GitHub`,
          'GITHUB_FETCH_ERROR',
          `HTTP ${error.status}: ${error.message}`
        );
      }

      throw new ZccError(
        `Failed to load pack '${name}': ${error}`,
        'PACK_LOAD_ERROR',
        'Check network connection and GitHub repository access'
      );
    }
  }

  async listPacks(): Promise<string[]> {
    logger.debug(`Listing packs from GitHub: ${this.sourceInfo.owner}/${this.sourceInfo.repo}`);

    try {
      // Try to get directory listing via GitHub API
      const packs = await this.listPacksViaApi();
      
      logger.debug(`Found ${packs.length} packs in GitHub repository`);
      return packs.sort();

    } catch (error) {
      logger.warn(`Error listing packs from GitHub repository: ${error}`);
      return [];
    }
  }

  async hasPack(name: string): Promise<boolean> {
    try {
      await this.loadPack(name);
      return true;
    } catch (error) {
      if (error instanceof ZccError && error.code === 'PACK_NOT_FOUND') {
        return false;
      }
      // For other errors, assume pack doesn't exist to be safe
      logger.debug(`Error checking for pack '${name}': ${error}`);
      return false;
    }
  }

  getSourceInfo(): LocalPackSourceInterface {
    return {
      name: this.sourceInfo.name,
      type: 'local', // IPackSource expects LocalPackSource interface
      path: `https://github.com/${this.sourceInfo.owner}/${this.sourceInfo.repo}`
    };
  }

  /**
   * Get the original GitHub source info
   */
  getGitHubSourceInfo(): GitHubPackSourceInterface {
    return this.sourceInfo;
  }

  async hasComponent(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<boolean> {
    try {
      // Use GitHub API to check if file exists
      const path = this.getComponentApiPath(packName, componentType, componentName);
      
      const headers = this.getAuthHeaders();
      const apiUrl = `https://api.github.com/repos/${this.sourceInfo.owner}/${this.sourceInfo.repo}/contents/${path}?ref=${this.branch}`;

      const response = await this.http.request(apiUrl, {
        method: 'GET',
        headers,
        timeout: 15000,
        retries: 1
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getComponentPath(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<string> {
    // Return raw GitHub URL for direct access
    const path = this.getComponentApiPath(packName, componentType, componentName);
    return `https://raw.githubusercontent.com/${this.sourceInfo.owner}/${this.sourceInfo.repo}/${this.branch}/${path}`;
  }

  /**
   * Get component content from GitHub with caching
   */
  async getComponentContent(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<string> {
    const cacheKey = `${packName}:${componentType}:${componentName}`;
    const cached = this.cache.componentCache.get(cacheKey);
    
    if (cached && !this.isCacheExpired({ timestamp: cached.timestamp, ttl: cached.ttl })) {
      logger.debug(`Using cached component content for ${cacheKey}`);
      return cached.content;
    }

    try {
      // Try GitHub API first (returns base64 encoded content)
      const content = await this.fetchComponentViaApi(packName, componentType, componentName);

      // Cache the content
      const ttl = this.sourceInfo.cacheTtl || this.DEFAULT_CACHE_TTL;
      this.cache.componentCache.set(cacheKey, {
        content,
        timestamp: Date.now(),
        ttl
      });

      logger.debug(`Successfully fetched component content for ${cacheKey}`);
      return content;

    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }

      if (error instanceof HttpError) {
        if (error.status === 404) {
          throw new ZccError(
            `Component '${componentName}' not found in pack '${packName}'`,
            'COMPONENT_NOT_FOUND',
            `Component type: ${componentType}`
          );
        }
        
        throw new ZccError(
          `Failed to fetch component '${componentName}' from GitHub`,
          'GITHUB_FETCH_ERROR',
          `HTTP ${error.status}: ${error.message}`
        );
      }

      throw new ZccError(
        `Failed to fetch component '${componentName}': ${error}`,
        'COMPONENT_LOAD_ERROR',
        'Check network connection and GitHub repository access'
      );
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    // Clear expired manifest cache entries
    for (const [key, cache] of this.cache.manifestCache.entries()) {
      if (this.isCacheExpired(cache)) {
        this.cache.manifestCache.delete(key);
      }
    }

    // Clear expired component cache entries
    for (const [key, cache] of this.cache.componentCache.entries()) {
      if (this.isCacheExpired({ timestamp: cache.timestamp, ttl: cache.ttl })) {
        this.cache.componentCache.delete(key);
      }
    }

    logger.debug('Cleared expired cache entries from GitHub pack source');
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.cache.manifestCache.clear();
    this.cache.componentCache.clear();
    logger.debug('Cleared all cache entries from GitHub pack source');
  }

  private async fetchManifestViaApi(packName: string): Promise<PackManifest> {
    const path = `${packName}/manifest.json`;
    const headers = this.getAuthHeaders();
    const apiUrl = `https://api.github.com/repos/${this.sourceInfo.owner}/${this.sourceInfo.repo}/contents/${path}`;

    // Add branch/ref parameter
    const url = `${apiUrl}?ref=${this.branch}`;

    const response = await this.http.request(url, {
      method: 'GET',
      headers,
      timeout: 30000,
      retries: 2
    });

    if (response.status !== 200) {
      throw new HttpError(`Failed to fetch manifest`, response.status);
    }

    try {
      const fileInfo = JSON.parse(response.data);
      
      if (fileInfo.type !== 'file' || !fileInfo.content) {
        throw new ZccError(
          `Invalid file response from GitHub API for manifest`,
          'INVALID_API_RESPONSE',
          'Expected file content in response'
        );
      }

      // GitHub API returns content as base64
      const manifestContent = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
      const manifest = JSON.parse(manifestContent);

      // Validate basic manifest structure
      if (!manifest.name || !manifest.version || !manifest.description) {
        throw new ZccError(
          `Invalid manifest for pack '${packName}': missing required fields`,
          'INVALID_MANIFEST',
          'Manifest must contain name, version, and description'
        );
      }

      return manifest;
    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }
      
      throw new ZccError(
        `Failed to parse manifest for pack '${packName}'`,
        'INVALID_JSON',
        `Error: ${error}`
      );
    }
  }

  private async listPacksViaApi(): Promise<string[]> {
    const headers = this.getAuthHeaders();
    const apiUrl = `https://api.github.com/repos/${this.sourceInfo.owner}/${this.sourceInfo.repo}/contents`;
    const url = `${apiUrl}?ref=${this.branch}`;

    const response = await this.http.request(url, {
      method: 'GET',
      headers,
      timeout: 30000,
      retries: 2
    });

    if (response.status !== 200) {
      throw new HttpError(`Failed to list repository contents`, response.status);
    }

    try {
      const contents = JSON.parse(response.data);
      
      if (!Array.isArray(contents)) {
        throw new Error('Expected array response from GitHub API');
      }

      // Find directories that contain manifest.json
      const packs: string[] = [];
      
      for (const item of contents) {
        if (item.type === 'dir') {
          const packName = item.name;
          
          // Check if this directory has a manifest.json
          try {
            const manifestUrl = `https://api.github.com/repos/${this.sourceInfo.owner}/${this.sourceInfo.repo}/contents/${packName}/manifest.json?ref=${this.branch}`;
            const manifestResponse = await this.http.request(manifestUrl, {
              method: 'GET',
              headers,
              timeout: 10000,
              retries: 1
            });
            
            if (manifestResponse.status === 200) {
              packs.push(packName);
            }
          } catch (error) {
            // Skip directories without manifests
            logger.debug(`Directory '${packName}' has no manifest, skipping`);
          }
        }
      }

      return packs;
    } catch (error) {
      throw new ZccError(
        'Failed to parse repository contents from GitHub API',
        'INVALID_API_RESPONSE',
        `Error: ${error}`
      );
    }
  }

  private async fetchComponentViaApi(
    packName: string,
    componentType: string,
    componentName: string
  ): Promise<string> {
    const path = this.getComponentApiPath(packName, componentType, componentName);
    const headers = this.getAuthHeaders();
    const apiUrl = `https://api.github.com/repos/${this.sourceInfo.owner}/${this.sourceInfo.repo}/contents/${path}`;
    const url = `${apiUrl}?ref=${this.branch}`;

    const response = await this.http.request(url, {
      method: 'GET',
      headers,
      timeout: 30000,
      retries: 2
    });

    if (response.status !== 200) {
      throw new HttpError(`Failed to fetch component`, response.status);
    }

    try {
      const fileInfo = JSON.parse(response.data);
      
      if (fileInfo.type !== 'file' || !fileInfo.content) {
        throw new ZccError(
          `Invalid file response from GitHub API for component`,
          'INVALID_API_RESPONSE',
          'Expected file content in response'
        );
      }

      // GitHub API returns content as base64
      return Buffer.from(fileInfo.content, 'base64').toString('utf-8');
    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }
      
      throw new ZccError(
        `Failed to parse component content`,
        'INVALID_API_RESPONSE',
        `Error: ${error}`
      );
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'zcc/1.0.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (this.sourceInfo.authToken) {
      headers['Authorization'] = `token ${this.sourceInfo.authToken}`;
    }

    return headers;
  }

  private getPackPath(packName: string): string {
    return `https://github.com/${this.sourceInfo.owner}/${this.sourceInfo.repo}/tree/${this.branch}/${packName}`;
  }

  private getComponentsPath(packName: string): string {
    return `https://github.com/${this.sourceInfo.owner}/${this.sourceInfo.repo}/tree/${this.branch}/${packName}/components`;
  }

  private getComponentApiPath(
    packName: string,
    componentType: string,
    componentName: string
  ): string {
    const extension = componentType === 'hooks' ? 'json' : 'md';
    return `${packName}/components/${componentType}/${componentName}.${extension}`;
  }

  private isCacheExpired(cache: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cache.timestamp > cache.ttl;
  }
}