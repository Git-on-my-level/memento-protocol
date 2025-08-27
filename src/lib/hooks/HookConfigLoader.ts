import { HookDefinition } from './types';
import { logger } from '../logger';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';

export class HookConfigLoader {
  private definitionsDir: string;
  private fs: FileSystemAdapter;

  constructor(definitionsDir: string, fs?: FileSystemAdapter) {
    this.definitionsDir = definitionsDir;
    this.fs = fs || new NodeFileSystemAdapter();
  }

  /**
   * Load all hook definitions from the definitions directory
   */
  async loadAll(): Promise<HookDefinition[]> {
    const definitions: HookDefinition[] = [];
    
    try {
      const files = await this.fs.readdir(this.definitionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          try {
            const definition = await this.loadDefinition(this.fs.join(this.definitionsDir, file));
            definitions.push(definition);
          } catch (error: any) {
            logger.warn(`Failed to load hook definition ${file}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      // Directory might not exist yet
      logger.debug(`Hook definitions directory not found: ${error.message}`);
    }
    
    return definitions;
  }

  /**
   * Load a single hook definition file
   */
  async loadDefinition(filePath: string): Promise<HookDefinition> {
    const content = await this.fs.readFile(filePath, 'utf-8') as string;
    
    if (filePath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      // For YAML support, we'd need to add a YAML parser dependency
      // For now, we'll just support JSON
      throw new Error('YAML support not yet implemented');
    }
    
    throw new Error('Unsupported file format');
  }

  /**
   * Save a hook definition
   */
  async saveDefinition(definition: HookDefinition, filename: string): Promise<void> {
    const filePath = this.fs.join(this.definitionsDir, filename);
    
    if (filename.endsWith('.json')) {
      await this.fs.writeFile(filePath, JSON.stringify(definition, null, 2));
    } else {
      throw new Error('Unsupported file format');
    }
  }

  /**
   * Delete a hook definition
   */
  async deleteDefinition(filename: string): Promise<void> {
    const filePath = this.fs.join(this.definitionsDir, filename);
    await this.fs.unlink(filePath);
  }
}