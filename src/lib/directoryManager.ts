import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export class DirectoryManager {
  private projectRoot: string;
  private mementoDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.mementoDir = path.join(projectRoot, '.memento');
  }

  /**
   * Check if Memento Protocol is already initialized
   */
  isInitialized(): boolean {
    return existsSync(this.mementoDir);
  }

  /**
   * Initialize the .memento directory structure
   */
  async initializeStructure(): Promise<void> {
    const directories = [
      this.mementoDir,
      path.join(this.mementoDir, 'modes'),
      path.join(this.mementoDir, 'workflows'),
      path.join(this.mementoDir, 'languages'),
      path.join(this.mementoDir, 'integrations'),
      path.join(this.mementoDir, 'tickets'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Create a manifest file to track installed components
    const manifestPath = path.join(this.mementoDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      const manifest = {
        version: '1.0.0',
        created: new Date().toISOString(),
        components: {
          modes: [],
          workflows: [],
          languages: {},
          integrations: []
        }
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }
  }

  /**
   * Validate the directory structure and report any issues
   */
  async validateStructure(): Promise<{ valid: boolean; missing: string[] }> {
    const requiredDirs = [
      'modes',
      'workflows',
      'languages',
      'integrations',
      'tickets'
    ];

    const missing: string[] = [];

    for (const dir of requiredDirs) {
      const fullPath = path.join(this.mementoDir, dir);
      if (!existsSync(fullPath)) {
        missing.push(dir);
      }
    }

    // Check for manifest file
    const manifestPath = path.join(this.mementoDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      missing.push('manifest.json');
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Ensure .gitignore includes .memento directory
   */
  async ensureGitignore(): Promise<void> {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    const mementoEntry = '.memento/';
    
    let gitignoreContent = '';
    
    // Read existing .gitignore if it exists
    if (existsSync(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    }

    // Check if .memento is already in .gitignore
    const lines = gitignoreContent.split('\n');
    const hasMementoEntry = lines.some(line => 
      line.trim() === '.memento' || 
      line.trim() === '.memento/' ||
      line.trim() === '/.memento' ||
      line.trim() === '/.memento/'
    );

    if (!hasMementoEntry) {
      // Add .memento entry
      if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
        gitignoreContent += '\n';
      }
      
      // Add a comment if this is the first entry
      if (!gitignoreContent.trim()) {
        gitignoreContent += '# Memento Protocol\n';
      } else {
        gitignoreContent += '\n# Memento Protocol\n';
      }
      
      gitignoreContent += mementoEntry + '\n';
      
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  /**
   * Get the path to a specific component
   */
  getComponentPath(type: 'modes' | 'workflows' | 'languages' | 'integrations', name: string): string {
    return path.join(this.mementoDir, type, `${name}.md`);
  }

  /**
   * Get the manifest data
   */
  async getManifest(): Promise<any> {
    const manifestPath = path.join(this.mementoDir, 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Update the manifest data
   */
  async updateManifest(manifest: any): Promise<void> {
    const manifestPath = path.join(this.mementoDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}