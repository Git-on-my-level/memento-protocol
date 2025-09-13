import { IPackSource, LocalPackSource } from '../packs/PackSource';
import { GitHubPackSource } from './GitHubPackSource';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';
import { PackagePaths } from '../packagePaths';

export interface SourceConfig {
  id: string;
  type: 'local' | 'github' | 'http' | 'custom';
  enabled: boolean;
  priority: number;
  config: any;
}

export interface SourceRegistryConfig {
  sources: SourceConfig[];
  defaultSource?: string;
}

export class SourceRegistry {
  private sources: Map<string, IPackSource> = new Map();
  private sourceConfigs: Map<string, SourceConfig> = new Map();
  private configPath: string;
  private defaultSourceId: string = 'local';

  constructor(private projectRoot: string, private fs: FileSystemAdapter = new NodeFileSystemAdapter()) {
    this.configPath = this.fs.join(projectRoot, '.zcc', 'sources.json');
  }

  async initialize(): Promise<void> {
    await this.loadConfiguration();
    await this.initializeSources();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      if (await this.fileExists(this.configPath)) {
        const content = await this.fs.readFile(this.configPath, 'utf-8') as string;
        const config: SourceRegistryConfig = JSON.parse(content);

        for (const sourceConfig of config.sources) {
          this.sourceConfigs.set(sourceConfig.id, sourceConfig);
        }

        if (config.defaultSource) {
          this.defaultSourceId = config.defaultSource;
        }
      } else {
        // Initialize with default configuration
        await this.initializeDefaultConfiguration();
      }
    } catch (error) {
      console.warn('Failed to load source configuration, using defaults');
      await this.initializeDefaultConfiguration();
    }
  }

  private async initializeDefaultConfiguration(): Promise<void> {
    const defaultConfig: SourceRegistryConfig = {
      sources: [
        {
          id: 'local',
          type: 'local',
          enabled: true,
          priority: 1,
          config: {
            path: PackagePaths.getTemplatesDir(),
          },
        },
      ],
      defaultSource: 'local',
    };

    for (const sourceConfig of defaultConfig.sources) {
      this.sourceConfigs.set(sourceConfig.id, sourceConfig);
    }

    this.defaultSourceId = defaultConfig.defaultSource || 'local';
    await this.saveConfiguration();
  }

  private async saveConfiguration(): Promise<void> {
    const config: SourceRegistryConfig = {
      sources: Array.from(this.sourceConfigs.values()),
      defaultSource: this.defaultSourceId,
    };

    await this.fs.mkdir(this.fs.dirname(this.configPath), { recursive: true });
    await this.fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2)
    );
  }

  private async initializeSources(): Promise<void> {
    for (const [id, config] of this.sourceConfigs) {
      if (!config.enabled) {
        continue;
      }
      
      try {
        const source = await this.createSource(config);
        if (source) {
          this.sources.set(id, source);
        }
      } catch (error: any) {
        console.warn(`Failed to initialize source ${id}: ${error.message}`);
      }
    }
  }

  private async createSource(config: SourceConfig): Promise<IPackSource | null> {
    switch (config.type) {
      case 'local':
        return new LocalPackSource(
          config.config.path || this.fs.join(this.projectRoot, 'templates')
        );
      
      case 'github':
        return new GitHubPackSource({
          name: config.id,
          owner: config.config.owner,
          repo: config.config.repo,
          branch: config.config.branch,
          directory: config.config.directory,
          token: config.config.token,
          trustLevel: config.config.trustLevel || 'untrusted',
        });
      
      case 'http':
        // Placeholder for HTTP source implementation
        console.warn('HTTP source type not yet implemented');
        return null;
      
      case 'custom':
        // Placeholder for custom source implementation
        console.warn('Custom source type not yet implemented');
        return null;
      
      default:
        console.warn(`Unknown source type: ${config.type}`);
        return null;
    }
  }

  async addSource(config: SourceConfig): Promise<void> {
    // Validate that ID doesn't already exist
    if (this.sourceConfigs.has(config.id)) {
      throw new Error(`Source with ID ${config.id} already exists`);
    }
    
    // Create and test the source
    const source = await this.createSource(config);
    if (!source) {
      throw new Error(`Failed to create source ${config.id}`);
    }
    
    // Test that the source works if listPacks is available
    try {
      if (typeof (source as any).listPacks === 'function') {
        await (source as any).listPacks();
      }
    } catch (error: any) {
      throw new Error(`Source ${config.id} is not accessible: ${error.message}`);
    }
    
    // Add to registry
    this.sourceConfigs.set(config.id, config);
    if (config.enabled) {
      this.sources.set(config.id, source);
    }
    
    await this.saveConfiguration();
  }

  async removeSource(id: string): Promise<void> {
    if (id === 'local') {
      throw new Error('Cannot remove the local source');
    }
    
    this.sources.delete(id);
    this.sourceConfigs.delete(id);
    
    // If this was the default source, switch to local
    if (this.defaultSourceId === id) {
      this.defaultSourceId = 'local';
    }
    
    await this.saveConfiguration();
  }

  async updateSource(id: string, updates: Partial<SourceConfig>): Promise<void> {
    const config = this.sourceConfigs.get(id);
    if (!config) {
      throw new Error(`Source ${id} not found`);
    }
    
    const updatedConfig = { ...config, ...updates, id }; // Ensure ID doesn't change
    
    // If type or config changed, recreate the source
    if (updates.type || updates.config) {
      const source = await this.createSource(updatedConfig);
      if (!source) {
        throw new Error(`Failed to update source ${id}`);
      }
      
      if (updatedConfig.enabled) {
        this.sources.set(id, source);
      }
    }
    
    // Update enabled status
    if (updates.enabled !== undefined) {
      if (updates.enabled && !this.sources.has(id)) {
        const source = await this.createSource(updatedConfig);
        if (source) {
          this.sources.set(id, source);
        }
      } else if (!updates.enabled) {
        this.sources.delete(id);
      }
    }
    
    this.sourceConfigs.set(id, updatedConfig);
    await this.saveConfiguration();
  }

  getSource(id: string): IPackSource | undefined {
    return this.sources.get(id);
  }

  getAllSources(): Map<string, IPackSource> {
    return new Map(this.sources);
  }

  getEnabledSources(): IPackSource[] {
    return Array.from(this.sources.values());
  }

  getSourceConfig(id: string): SourceConfig | undefined {
    return this.sourceConfigs.get(id);
  }

  getAllSourceConfigs(): SourceConfig[] {
    return Array.from(this.sourceConfigs.values());
  }

  async listAllPacks(): Promise<Map<string, string[]>> {
    const packsBySource = new Map<string, string[]>();

    for (const id of this.sources.keys()) {
      const source = this.getSource(id);
      if (!source) continue;
      try {
        const packs = await source.listPacks();
        packsBySource.set(id, packs);
      } catch (error: any) {
        console.warn(`Failed to list packs from source ${id}: ${error.message}`);
        packsBySource.set(id, []);
      }
    }

    return packsBySource;
  }

  async findPack(packName: string): Promise<{ source: IPackSource; sourceId: string } | null> {
    // First check default source
    const defaultSource = this.getSource(this.defaultSourceId);
    if (defaultSource && await defaultSource.hasPack(packName)) {
      return { source: defaultSource, sourceId: this.defaultSourceId };
    }

    // Check other sources by priority
    const sortedSources = Array.from(this.sourceConfigs.entries())
      .filter(([id, config]) => config.enabled && id !== this.defaultSourceId)
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [id, _] of sortedSources) {
      const source = this.getSource(id);
      if (source && await source.hasPack(packName)) {
        return { source, sourceId: id };
      }
    }

    return null;
  }

  setDefaultSource(id: string): void {
    if (!this.sourceConfigs.has(id)) {
      throw new Error(`Source ${id} not found`);
    }
    
    this.defaultSourceId = id;
  }

  getDefaultSource(): string {
    return this.defaultSourceId;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fs.exists(filePath);
    } catch {
      return false;
    }
  }
}