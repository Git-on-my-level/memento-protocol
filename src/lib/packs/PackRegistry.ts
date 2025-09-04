/**
 * PackRegistry handles pack discovery, resolution, and dependency management
 */

import {
  PackStructure,
  PackDependencyResult,
} from "../types/packs";
import { logger } from "../logger";
import { ZccError } from "../errors";
import { PackagePaths } from "../packagePaths";
import { IPackSource, LocalPackSource } from "./PackSource";
import { RemotePackSource } from "./RemotePackSource";
import { GitHubPackSource } from "./GitHubPackSource";
import { 
  RemotePackSource as RemotePackSourceInterface,
  GitHubPackSource as GitHubPackSourceInterface 
} from "../types/packs";
import { FileSystemAdapter } from "../adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "../adapters/NodeFileSystemAdapter";

export class PackRegistry {
  private sources: Map<string, IPackSource>;
  private packCache: Map<string, PackStructure>;
  private fs: FileSystemAdapter;

  constructor(fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.sources = new Map();
    this.packCache = new Map();
    
    // Register default local source
    this.registerDefaultSources();
  }

  /**
   * Register pack sources
   */
  private registerDefaultSources(): void {
    // Register built-in starter packs source
    const starterPacksDir = this.fs.join(PackagePaths.getTemplatesDir(), "starter-packs");
    const localSource = new LocalPackSource(starterPacksDir, this.fs);
    this.sources.set('local', localSource);
    
    logger.debug('Registered default pack sources');
  }

  /**
   * Register a custom pack source
   */
  registerSource(name: string, source: IPackSource): void {
    this.sources.set(name, source);
    logger.debug(`Registered pack source: ${name}`);
  }

  /**
   * Register a remote pack source
   */
  registerRemoteSource(name: string, sourceInfo: RemotePackSourceInterface): void {
    const remoteSource = new RemotePackSource(sourceInfo);
    this.registerSource(name, remoteSource);
    logger.debug(`Registered remote pack source: ${name} -> ${sourceInfo.url}`);
  }

  /**
   * Register a GitHub pack source
   */
  registerGitHubSource(name: string, sourceInfo: GitHubPackSourceInterface): void {
    const githubSource = new GitHubPackSource(sourceInfo);
    this.registerSource(name, githubSource);
    logger.debug(`Registered GitHub pack source: ${name} -> ${sourceInfo.owner}/${sourceInfo.repo}`);
  }

  /**
   * Register a GitHub source using repository URL
   */
  registerGitHubFromUrl(name: string, url: string, options?: {
    branch?: string;
    authToken?: string;
    cacheTtl?: number;
  }): void {
    const parsed = this.parseGitHubUrl(url);
    if (!parsed) {
      throw new ZccError(
        'Invalid GitHub URL format',
        'INVALID_GITHUB_URL',
        'Expected format: https://github.com/owner/repo or github:owner/repo'
      );
    }

    const sourceInfo: GitHubPackSourceInterface = {
      name,
      type: 'github',
      owner: parsed.owner,
      repo: parsed.repo,
      branch: options?.branch || 'main',
      authToken: options?.authToken,
      cacheTtl: options?.cacheTtl
    };

    this.registerGitHubSource(name, sourceInfo);
  }

  /**
   * Register a remote source from URL with automatic type detection
   */
  registerFromUrl(name: string, url: string, options?: {
    authToken?: string;
    cacheTtl?: number;
    branch?: string;
  }): void {
    // Try to detect if it's a GitHub URL
    const githubParsed = this.parseGitHubUrl(url);
    if (githubParsed) {
      this.registerGitHubFromUrl(name, url, options);
      return;
    }

    // Otherwise, treat as generic remote source
    const sourceInfo: RemotePackSourceInterface = {
      name,
      type: 'remote',
      url,
      authToken: options?.authToken,
      cacheTtl: options?.cacheTtl
    };

    this.registerRemoteSource(name, sourceInfo);
  }

  /**
   * Get a pack source by name
   */
  getSource(name: string): IPackSource | undefined {
    return this.sources.get(name);
  }

  /**
   * Get the default local pack source
   */
  getDefaultSource(): IPackSource {
    const defaultSource = this.sources.get('local');
    if (!defaultSource) {
      throw new ZccError(
        'Default pack source not found',
        'SOURCE_NOT_FOUND',
        'The default local pack source was not properly initialized'
      );
    }
    return defaultSource;
  }

  /**
   * List all available packs from all sources
   */
  async listAvailablePacks(): Promise<PackStructure[]> {
    const allPacks: PackStructure[] = [];
    const seenPacks = new Set<string>();

    for (const [sourceName, source] of this.sources) {
      try {
        logger.debug(`Listing packs from source: ${sourceName}`);
        const packNames = await source.listPacks();
        
        for (const packName of packNames) {
          if (seenPacks.has(packName)) {
            logger.debug(`Pack '${packName}' already found in another source, skipping`);
            continue;
          }

          try {
            const pack = await this.loadPack(packName, sourceName);
            allPacks.push(pack);
            seenPacks.add(packName);
          } catch (error) {
            logger.warn(`Failed to load pack '${packName}' from ${sourceName}: ${error}`);
          }
        }
      } catch (error) {
        logger.warn(`Error listing packs from source '${sourceName}': ${error}`);
      }
    }

    logger.debug(`Found ${allPacks.length} total packs across all sources`);
    return allPacks;
  }

  /**
   * Load a specific pack by name, searching all sources
   */
  async loadPack(packName: string, preferredSource?: string): Promise<PackStructure> {
    // Check cache first
    const cacheKey = preferredSource ? `${preferredSource}:${packName}` : packName;
    if (this.packCache.has(cacheKey)) {
      return this.packCache.get(cacheKey)!;
    }

    let lastError: Error | null = null;
    const sourcesToTry = preferredSource 
      ? [preferredSource] 
      : Array.from(this.sources.keys());

    for (const sourceName of sourcesToTry) {
      const source = this.sources.get(sourceName);
      if (!source) {
        continue;
      }

      try {
        logger.debug(`Trying to load pack '${packName}' from source '${sourceName}'`);
        const hasPackResult = await source.hasPack(packName);
        
        if (hasPackResult) {
          const pack = await source.loadPack(packName);
          
          // Cache the result
          this.packCache.set(cacheKey, pack);
          
          logger.debug(`Successfully loaded pack '${packName}' from '${sourceName}'`);
          return pack;
        }
      } catch (error) {
        lastError = error as Error;
        logger.debug(`Failed to load pack '${packName}' from '${sourceName}': ${error}`);
      }
    }

    throw new ZccError(
      `Pack '${packName}' not found in any registered source`,
      'PACK_NOT_FOUND',
      lastError ? `Last error: ${lastError.message}` : 'No sources available'
    );
  }

  /**
   * Check if a pack exists in any source
   */
  async hasPack(packName: string): Promise<boolean> {
    for (const source of this.sources.values()) {
      try {
        if (await source.hasPack(packName)) {
          return true;
        }
      } catch (error) {
        // Continue checking other sources
        logger.debug(`Error checking for pack '${packName}': ${error}`);
      }
    }
    return false;
  }

  /**
   * Resolve pack dependencies in installation order
   */
  async resolveDependencies(packName: string): Promise<PackDependencyResult> {
    const resolved: string[] = [];
    const missing: string[] = [];
    const circular: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = async (currentPackName: string, dependencyChain: string[] = []): Promise<void> => {
      // Check for circular dependencies
      if (visiting.has(currentPackName)) {
        circular.push(currentPackName);
        logger.warn(`Circular dependency detected: ${dependencyChain.join(' → ')} → ${currentPackName}`);
        return;
      }

      // Skip if already processed
      if (visited.has(currentPackName)) {
        return;
      }

      // Check if pack exists
      if (!(await this.hasPack(currentPackName))) {
        missing.push(currentPackName);
        logger.warn(`Missing dependency: ${currentPackName}`);
        return;
      }

      visiting.add(currentPackName);
      
      try {
        // Load the pack to get its dependencies
        const pack = await this.loadPack(currentPackName);
        const dependencies = pack.manifest.dependencies || [];

        // Process each dependency recursively
        for (const dependency of dependencies) {
          await visit(dependency, [...dependencyChain, currentPackName]);
        }

        // Mark as processed and add to resolution order
        visiting.delete(currentPackName);
        visited.add(currentPackName);
        resolved.push(currentPackName);

        logger.debug(`Resolved dependencies for '${currentPackName}'`);
      } catch (error) {
        visiting.delete(currentPackName);
        missing.push(currentPackName);
        logger.error(`Error resolving dependencies for '${currentPackName}': ${error}`);
      }
    };

    // Start dependency resolution
    await visit(packName);

    // Remove the main pack from resolved list since we only want its dependencies
    const mainPackIndex = resolved.indexOf(packName);
    if (mainPackIndex !== -1) {
      resolved.splice(mainPackIndex, 1);
    }

    return {
      resolved,
      missing,
      circular,
    };
  }

  /**
   * Get packs that match specific criteria
   */
  async searchPacks(criteria: {
    category?: string;
    tags?: string[];
    compatibleWith?: string[];
    author?: string;
  }): Promise<PackStructure[]> {
    const allPacks = await this.listAvailablePacks();
    
    return allPacks.filter(pack => {
      const manifest = pack.manifest;
      
      // Category filter
      if (criteria.category && manifest.category !== criteria.category) {
        return false;
      }
      
      // Tags filter (pack must have ALL specified tags)
      if (criteria.tags && criteria.tags.length > 0) {
        const packTags = manifest.tags || [];
        const hasAllTags = criteria.tags.every(tag => packTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }
      
      // Compatibility filter (pack must be compatible with ANY specified type)
      if (criteria.compatibleWith && criteria.compatibleWith.length > 0) {
        const packCompatibility = manifest.compatibleWith || [];
        const isCompatible = criteria.compatibleWith.some(type => 
          packCompatibility.includes(type as any)
        );
        if (!isCompatible) {
          return false;
        }
      }
      
      // Author filter
      if (criteria.author && manifest.author !== criteria.author) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get pack recommendations based on project type
   */
  async getRecommendedPacks(projectType: string): Promise<PackStructure[]> {
    logger.debug(`Getting recommended packs for project type: ${projectType}`);
    
    const recommendations = await this.searchPacks({
      compatibleWith: [projectType],
    });

    // Sort by popularity/quality metrics (for now, just alphabetical)
    recommendations.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
    
    logger.debug(`Found ${recommendations.length} recommended packs for ${projectType}`);
    return recommendations;
  }

  /**
   * Validate that all dependencies for a pack can be resolved
   */
  async validateDependencies(packName: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const dependencyResult = await this.resolveDependencies(packName);
      
      // Check for missing dependencies
      if (dependencyResult.missing.length > 0) {
        issues.push(`Missing dependencies: ${dependencyResult.missing.join(', ')}`);
      }
      
      // Check for circular dependencies
      if (dependencyResult.circular.length > 0) {
        issues.push(`Circular dependencies: ${dependencyResult.circular.join(', ')}`);
      }
      
      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Error validating dependencies: ${error}`],
      };
    }
  }

  /**
   * Clear the pack cache
   */
  clearCache(): void {
    this.packCache.clear();
    logger.debug('Cleared pack cache');
  }

  /**
   * Clear expired caches from all remote sources
   */
  clearExpiredCaches(): void {
    for (const source of this.sources.values()) {
      if (source instanceof RemotePackSource || source instanceof GitHubPackSource) {
        source.clearExpiredCache();
      }
    }
    logger.debug('Cleared expired caches from remote sources');
  }

  /**
   * Clear all caches from all sources
   */
  clearAllCaches(): void {
    this.packCache.clear();
    
    for (const source of this.sources.values()) {
      if (source instanceof RemotePackSource || source instanceof GitHubPackSource) {
        source.clearAllCache();
      }
    }
    logger.debug('Cleared all caches from all sources');
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalPacks: number;
    sourceCount: number;
    categoryCounts: Record<string, number>;
    authorCounts: Record<string, number>;
  }> {
    const allPacks = await this.listAvailablePacks();
    const categoryCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    
    for (const pack of allPacks) {
      const category = pack.manifest.category || 'general';
      const author = pack.manifest.author;
      
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    }
    
    return {
      totalPacks: allPacks.length,
      sourceCount: this.sources.size,
      categoryCounts,
      authorCounts,
    };
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - github:owner/repo
    // - git@github.com:owner/repo.git
    
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^github:([^\/]+)\/([^\/]+)$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const [, owner, repo] = match;
        return {
          owner: owner.trim(),
          repo: repo.trim()
        };
      }
    }

    return null;
  }
}