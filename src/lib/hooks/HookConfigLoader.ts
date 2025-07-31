import * as fs from 'fs/promises';
import * as path from 'path';
import { HookDefinition } from './types';
import { logger } from '../logger';

export class HookConfigLoader {
  private definitionsDir: string;

  constructor(definitionsDir: string) {
    this.definitionsDir = definitionsDir;
  }

  /**
   * Load all hook definitions from the definitions directory
   */
  async loadAll(): Promise<HookDefinition[]> {
    const definitions: HookDefinition[] = [];
    
    try {
      const files = await fs.readdir(this.definitionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          try {
            const definition = await this.loadDefinition(path.join(this.definitionsDir, file));
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
    const content = await fs.readFile(filePath, 'utf-8');
    
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
    const filePath = path.join(this.definitionsDir, filename);
    
    if (filename.endsWith('.json')) {
      await fs.writeFile(filePath, JSON.stringify(definition, null, 2));
    } else {
      throw new Error('Unsupported file format');
    }
  }

  /**
   * Delete a hook definition
   */
  async deleteDefinition(filename: string): Promise<void> {
    const filePath = path.join(this.definitionsDir, filename);
    await fs.unlink(filePath);
  }
}