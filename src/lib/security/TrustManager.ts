import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';
import * as crypto from 'crypto';
import { IPackSource } from '../packs/PackSource';
import { PackStructure } from '../types/packs';

export interface TrustPolicy {
  allowUntrustedSources: boolean;
  requireUserConsent: boolean;
  auditInstallations: boolean;
  maxPackSize: number; // in bytes
  allowedDomains: string[];
  blockedDomains: string[];
  trustedAuthors: string[];
  trustedSources: string[];
}

export interface TrustRecord {
  sourceId: string;
  packName: string;
  packVersion: string;
  author: string;
  timestamp: string;
  action: 'installed' | 'updated' | 'removed';
  userConsent: boolean;
  checksum?: string;
}

export interface SecurityValidationResult {
  valid: boolean;
  trusted: boolean;
  warnings: string[];
  errors: string[];
  requiresConsent: boolean;
}

export class TrustManager {
  private trustPolicyPath: string;
  private trustRecordsPath: string;
  private trustedSourcesPath: string;
  private policy: TrustPolicy;
  private records: TrustRecord[] = [];
  private trustedSources: Map<string, TrustedSourceConfig> = new Map();

  constructor(private projectRoot: string, private fs: FileSystemAdapter = new NodeFileSystemAdapter()) {
    this.trustPolicyPath = this.fs.join(projectRoot, '.zcc', 'security', 'trust-policy.json');
    this.trustRecordsPath = this.fs.join(projectRoot, '.zcc', 'security', 'trust-records.json');
    this.trustedSourcesPath = this.fs.join(projectRoot, '.zcc', 'security', 'trusted-sources.json');
    
    // Default trust policy
    this.policy = {
      allowUntrustedSources: false,
      requireUserConsent: true,
      auditInstallations: true,
      maxPackSize: 10 * 1024 * 1024, // 10MB
      allowedDomains: ['github.com', 'gitlab.com'],
      blockedDomains: [],
      trustedAuthors: ['zcc', 'zcc-community'],
      trustedSources: ['local', 'zcc-official'],
    };
  }

  async initialize(): Promise<void> {
    await this.ensureSecurityDirectory();
    await this.loadPolicy();
    await this.loadRecords();
    await this.loadTrustedSources();
  }

  private async ensureSecurityDirectory(): Promise<void> {
    const securityDir = this.fs.join(this.projectRoot, '.zcc', 'security');
    await this.fs.mkdir(securityDir, { recursive: true });
  }

  private async loadPolicy(): Promise<void> {
    try {
      if (await this.fileExists(this.trustPolicyPath)) {
        const content = await this.fs.readFile(this.trustPolicyPath, 'utf-8') as string;
        this.policy = { ...this.policy, ...JSON.parse(content) };
      } else {
        await this.savePolicy();
      }
    } catch (error) {
      console.warn('Failed to load trust policy, using defaults');
    }
  }

  private async savePolicy(): Promise<void> {
    await this.fs.writeFile(
      this.trustPolicyPath,
      JSON.stringify(this.policy, null, 2)
    );
  }

  private async loadRecords(): Promise<void> {
    try {
      if (await this.fileExists(this.trustRecordsPath)) {
        const content = await this.fs.readFile(this.trustRecordsPath, 'utf-8') as string;
        this.records = JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load trust records');
      this.records = [];
    }
  }

  private async saveRecords(): Promise<void> {
    await this.fs.writeFile(
      this.trustRecordsPath,
      JSON.stringify(this.records, null, 2)
    );
  }

  private async loadTrustedSources(): Promise<void> {
    try {
      if (await this.fileExists(this.trustedSourcesPath)) {
        const content = await this.fs.readFile(this.trustedSourcesPath, 'utf-8') as string;
        const sources = JSON.parse(content);
        this.trustedSources = new Map(Object.entries(sources));
      } else {
        // Initialize with default trusted sources
        await this.addTrustedSource('local', {
          type: 'local',
          path: 'templates/',
          trusted: true,
        });
      }
    } catch (error) {
      console.warn('Failed to load trusted sources');
    }
  }

  private async saveTrustedSources(): Promise<void> {
    const sources = Object.fromEntries(this.trustedSources);
    await this.fs.writeFile(
      this.trustedSourcesPath,
      JSON.stringify(sources, null, 2)
    );
  }

  async validateSource(source: IPackSource): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      valid: true,
      trusted: false,
      warnings: [],
      errors: [],
      requiresConsent: false,
    };

    const sourceInfo = source.getSourceInfo();
    
    // Check if source is explicitly trusted
    if (this.isTrustedSource(sourceInfo.name)) {
      result.trusted = true;
      return result;
    }

    // Check source type (treat any non-local source as remote)
    const sourceType = (sourceInfo as any).type;
    if (sourceType && sourceType !== 'local') {
      // Validate domain if it's a URL
      const domain = this.extractDomain(sourceInfo.path);
      if (domain) {
        if (this.policy.blockedDomains.includes(domain)) {
          result.valid = false;
          result.errors.push(`Source domain ${domain} is blocked`);
          return result;
        }
        
        if (this.policy.allowedDomains.length > 0 && 
            !this.policy.allowedDomains.includes(domain)) {
          result.warnings.push(`Source domain ${domain} is not in allowed list`);
          result.requiresConsent = true;
        }
      }
      
      // Untrusted remote sources require consent
      if (!this.policy.allowUntrustedSources) {
        result.requiresConsent = true;
        result.warnings.push('Source is not trusted and requires user consent');
      }
    }

    return result;
  }

  async validatePack(
    pack: PackStructure,
    source: IPackSource
  ): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      valid: true,
      trusted: false,
      warnings: [],
      errors: [],
      requiresConsent: false,
    };

    // Check author trust
    if (this.policy.trustedAuthors.includes(pack.manifest.author)) {
      result.trusted = true;
    }

    // Check pack size (if we can determine it)
    // This would need to be implemented based on actual pack structure
    
    // Check for dangerous patterns in pack components
    if (pack.manifest.hooks && pack.manifest.hooks.length > 0) {
      result.warnings.push(
        `Pack registers ${pack.manifest.hooks.length} hooks that will modify Claude Code behavior`
      );
      if (!result.trusted) {
        result.requiresConsent = true;
      }
    }

    if (pack.manifest.postInstall) {
      result.warnings.push(
        'Pack contains post-install commands (disabled for security)'
      );
    }

    // Check component counts
    const componentCount = 
      (pack.manifest.components.modes?.length || 0) +
      (pack.manifest.components.workflows?.length || 0) +
      (pack.manifest.components.agents?.length || 0);
    
    if (componentCount > 50) {
      result.warnings.push(
        `Pack contains ${componentCount} components, which is unusually high`
      );
    }

    // Combine with source validation
    const sourceValidation = await this.validateSource(source);
    result.warnings.push(...sourceValidation.warnings);
    result.errors.push(...sourceValidation.errors);
    result.valid = result.valid && sourceValidation.valid;
    result.requiresConsent = result.requiresConsent || sourceValidation.requiresConsent;

    return result;
  }

  async recordInstallation(
    source: IPackSource,
    pack: PackStructure,
    userConsent: boolean
  ): Promise<void> {
    if (!this.policy.auditInstallations) {
      return;
    }

    const sourceInfo = source.getSourceInfo();
    const record: TrustRecord = {
      sourceId: sourceInfo.name,
      packName: pack.manifest.name,
      packVersion: pack.manifest.version,
      author: pack.manifest.author,
      timestamp: new Date().toISOString(),
      action: 'installed',
      userConsent,
      checksum: await this.calculatePackChecksum(pack),
    };

    this.records.push(record);
    await this.saveRecords();
  }

  async addTrustedSource(
    sourceId: string,
    config: TrustedSourceConfig
  ): Promise<void> {
    this.trustedSources.set(sourceId, config);
    await this.saveTrustedSources();
  }

  async removeTrustedSource(sourceId: string): Promise<void> {
    this.trustedSources.delete(sourceId);
    await this.saveTrustedSources();
  }

  isTrustedSource(sourceId: string): boolean {
    return this.trustedSources.has(sourceId) ||
           this.policy.trustedSources.includes(sourceId);
  }

  getTrustedSources(): string[] {
    return [
      ...Array.from(this.trustedSources.keys()),
      ...this.policy.trustedSources,
    ];
  }

  async updatePolicy(updates: Partial<TrustPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...updates };
    await this.savePolicy();
  }

  getPolicy(): TrustPolicy {
    return { ...this.policy };
  }

  getInstallationHistory(packName?: string): TrustRecord[] {
    if (packName) {
      return this.records.filter(r => r.packName === packName);
    }
    return [...this.records];
  }

  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  private async calculatePackChecksum(pack: PackStructure): Promise<string> {
    // Calculate checksum based on manifest
    const content = JSON.stringify(pack.manifest);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fs.exists(filePath);
    } catch {
      return false;
    }
  }

  // Security scanning methods
  async scanPackForThreats(pack: PackStructure): Promise<string[]> {
    const threats: string[] = [];
    
    // Scan for suspicious patterns in component names
    const suspiciousPatterns = [
      /eval/i,
      /exec/i,
      /system/i,
      /spawn/i,
      /\brm\s+-rf/i,
      /curl.*\|.*sh/i,
    ];
    
    const allComponents = [
      ...(pack.manifest.components.modes || []),
      ...(pack.manifest.components.workflows || []),
      ...(pack.manifest.components.agents || []),
    ];
    
    for (const component of allComponents) {
      const name = typeof component === 'string' ? component : component.name;
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(name)) {
          threats.push(`Suspicious pattern in component name: ${name}`);
        }
      }
    }
    
    return threats;
  }
}

interface TrustedSourceConfig {
  type: string;
  path?: string;
  trusted: boolean;
  addedAt?: string;
  description?: string;
}