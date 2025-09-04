/**
 * Remote pack source implementation for loading packs from remote URLs
 */

import { IPackSource } from "./PackSource";
import { 
  PackManifest, 
  PackStructure, 
  RemotePackSource as RemotePackSourceInterface,
  RemotePackCache,
  LocalPackSource as LocalPackSourceInterface
} from "../types/packs";
import { HttpAdapter, NodeHttpAdapter, HttpError } from "../adapters/HttpAdapter";
import { logger } from "../logger";
import { ZccError } from "../errors";

export class RemotePackSource implements IPackSource {
  private readonly sourceInfo: RemotePackSourceInterface;
  private readonly http: HttpAdapter;
  private readonly cache: RemotePackCache;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(sourceInfo: RemotePackSourceInterface, http?: HttpAdapter) {
    this.sourceInfo = sourceInfo;
    this.http = http || new NodeHttpAdapter();
    this.cache = {
      manifestCache: new Map(),
      componentCache: new Map()
    };
  }

  async loadPack(name: string): Promise<PackStructure> {
    logger.debug(`Loading pack '${name}' from remote source: ${this.sourceInfo.url}`);

    // Check cache first
    const cacheKey = `${name}:manifest`;
    const cachedManifest = this.cache.manifestCache.get(cacheKey);
    
    if (cachedManifest && !this.isCacheExpired(cachedManifest)) {
      logger.debug(`Using cached manifest for pack '${name}'`);
      return {
        manifest: cachedManifest.manifest,
        path: `${this.sourceInfo.url}/${name}`,
        componentsPath: `${this.sourceInfo.url}/${name}/components`
      };
    }

    try {
      // Construct manifest URL
      const manifestUrl = this.buildUrl(name, 'manifest.json');
      
      // Fetch manifest with authentication if available
      const headers: Record<string, string> = {};
      if (this.sourceInfo.authToken) {
        headers['Authorization'] = `Bearer ${this.sourceInfo.authToken}`;
      }

      const response = await this.http.request(manifestUrl, {
        method: 'GET',
        headers,
        timeout: 30000,
        retries: 2
      });

      if (response.status !== 200) {
        throw new ZccError(
          `Failed to fetch manifest for pack '${name}'`,
          'MANIFEST_FETCH_ERROR',
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Parse manifest
      let manifest: PackManifest;
      try {
        manifest = JSON.parse(response.data);
      } catch (error) {
        throw new ZccError(
          `Invalid JSON in manifest for pack '${name}'`,
          'INVALID_JSON',
          `Failed to parse manifest: ${error}`
        );
      }

      // Validate basic manifest structure
      if (!manifest.name || !manifest.version || !manifest.description) {
        throw new ZccError(
          `Invalid manifest for pack '${name}': missing required fields`,
          'INVALID_MANIFEST',
          'Manifest must contain name, version, and description'
        );
      }

      // Cache the manifest
      const ttl = this.sourceInfo.cacheTtl || this.DEFAULT_CACHE_TTL;
      this.cache.manifestCache.set(cacheKey, {
        manifest,
        timestamp: Date.now(),
        ttl
      });

      logger.debug(`Successfully loaded pack '${name}' from remote source`);

      return {
        manifest,
        path: `${this.sourceInfo.url}/${name}`,
        componentsPath: `${this.sourceInfo.url}/${name}/components`
      };

    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }

      if (error instanceof HttpError) {
        if (error.status === 404) {
          throw new ZccError(
            `Pack '${name}' not found in remote source`,
            'PACK_NOT_FOUND',
            `Remote URL: ${this.sourceInfo.url}`
          );
        }
        
        throw new ZccError(
          `Failed to fetch pack '${name}' from remote source`,
          'REMOTE_FETCH_ERROR',
          `HTTP ${error.status}: ${error.message}`
        );
      }

      throw new ZccError(
        `Failed to load pack '${name}': ${error}`,
        'PACK_LOAD_ERROR',
        'Check network connection and remote source availability'
      );
    }
  }

  async listPacks(): Promise<string[]> {
    logger.debug(`Listing packs from remote source: ${this.sourceInfo.url}`);

    try {
      // Many remote sources provide an index file or API endpoint
      const indexUrl = this.buildUrl('', 'index.json');
      
      const headers: Record<string, string> = {};
      if (this.sourceInfo.authToken) {
        headers['Authorization'] = `Bearer ${this.sourceInfo.authToken}`;
      }

      const response = await this.http.request(indexUrl, {
        method: 'GET',
        headers,
        timeout: 30000,
        retries: 2
      });

      if (response.status === 404) {
        logger.warn(`No index found at ${indexUrl}, cannot list packs from remote source`);
        return [];
      }

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse index
      let index: { packs: string[] } | string[];
      try {
        const parsed = JSON.parse(response.data);
        index = Array.isArray(parsed) ? parsed : parsed.packs || [];
      } catch (error) {
        logger.warn(`Failed to parse index from remote source: ${error}`);
        return [];
      }

      const packs = Array.isArray(index) ? index : [];
      logger.debug(`Found ${packs.length} packs in remote source`);
      return packs.sort();

    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        logger.debug(`No index found at remote source, cannot list packs`);
        return [];
      }
      
      logger.warn(`Error listing packs from remote source ${this.sourceInfo.url}: ${error}`);
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
      path: this.sourceInfo.url
    };
  }

  /**
   * Get the original remote source info
   */
  getRemoteSourceInfo(): RemotePackSourceInterface {
    return this.sourceInfo;
  }

  async hasComponent(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<boolean> {
    try {
      const componentUrl = this.buildComponentUrl(packName, componentType, componentName);
      
      const headers: Record<string, string> = {};
      if (this.sourceInfo.authToken) {
        headers['Authorization'] = `Bearer ${this.sourceInfo.authToken}`;
      }

      // Use HEAD request to check existence without downloading content
      const response = await this.http.request(componentUrl, {
        method: 'GET', // Some servers don't support HEAD properly, use GET but don't cache
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
    // For remote sources, return the URL rather than a local path
    return this.buildComponentUrl(packName, componentType, componentName);
  }

  /**
   * Get component content from remote source with caching
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
      const componentUrl = this.buildComponentUrl(packName, componentType, componentName);
      
      const headers: Record<string, string> = {};
      if (this.sourceInfo.authToken) {
        headers['Authorization'] = `Bearer ${this.sourceInfo.authToken}`;
      }

      const response = await this.http.request(componentUrl, {
        method: 'GET',
        headers,
        timeout: 30000,
        retries: 2
      });

      if (response.status !== 200) {
        throw new ZccError(
          `Failed to fetch component '${componentName}' from pack '${packName}'`,
          'COMPONENT_FETCH_ERROR',
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Cache the content
      const ttl = this.sourceInfo.cacheTtl || this.DEFAULT_CACHE_TTL;
      this.cache.componentCache.set(cacheKey, {
        content: response.data,
        timestamp: Date.now(),
        ttl
      });

      logger.debug(`Successfully fetched component content for ${cacheKey}`);
      return response.data;

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
          `Failed to fetch component '${componentName}' from remote source`,
          'REMOTE_FETCH_ERROR',
          `HTTP ${error.status}: ${error.message}`
        );
      }

      throw new ZccError(
        `Failed to fetch component '${componentName}': ${error}`,
        'COMPONENT_LOAD_ERROR',
        'Check network connection and remote source availability'
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

    logger.debug('Cleared expired cache entries from remote pack source');
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.cache.manifestCache.clear();
    this.cache.componentCache.clear();
    logger.debug('Cleared all cache entries from remote pack source');
  }

  private buildUrl(packName: string, file: string): string {
    const baseUrl = this.sourceInfo.url.endsWith('/') 
      ? this.sourceInfo.url.slice(0, -1) 
      : this.sourceInfo.url;
    
    if (packName) {
      return `${baseUrl}/${packName}/${file}`;
    }
    return `${baseUrl}/${file}`;
  }

  private buildComponentUrl(
    packName: string, 
    componentType: string, 
    componentName: string
  ): string {
    const extension = componentType === 'hooks' ? 'json' : 'md';
    return this.buildUrl(packName, `components/${componentType}/${componentName}.${extension}`);
  }

  private isCacheExpired(cache: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cache.timestamp > cache.ttl;
  }
}