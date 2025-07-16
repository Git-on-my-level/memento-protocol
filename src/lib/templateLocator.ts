import * as path from 'path';
import { existsSync } from 'fs';

/**
 * Utility class to locate template directories
 * Handles both development and production environments
 */
export class TemplateLocator {
  /**
   * Get the templates directory path
   * Checks multiple locations to support different environments
   */
  static getTemplatesDir(): string {
    // Check if we're in the memento repo (development)
    const repoTemplatesDir = path.join(process.cwd(), 'templates');
    if (existsSync(repoTemplatesDir)) {
      return repoTemplatesDir;
    }

    // Check relative to the executable
    const execTemplatesDir = path.join(
      path.dirname(require.main?.filename || __dirname),
      'templates'
    );
    if (existsSync(execTemplatesDir)) {
      return execTemplatesDir;
    }

    // Check relative to this file (in dist)
    const distTemplatesDir = path.join(__dirname, '..', '..', 'templates');
    if (existsSync(distTemplatesDir)) {
      return distTemplatesDir;
    }

    // Fallback to current directory templates
    return path.join(process.cwd(), 'templates');
  }

  /**
   * Get the path to a specific template file
   */
  static getTemplatePath(type: 'modes' | 'workflows' | 'agents', filename: string): string {
    return path.join(this.getTemplatesDir(), type, filename);
  }

  /**
   * Check if templates directory exists
   */
  static hasTemplates(): boolean {
    return existsSync(this.getTemplatesDir());
  }
}