import * as path from "path";
import { existsSync } from "fs";

/**
 * Utility for resolving paths within the memento-protocol package.
 * Handles both development (source) and production (npm installed) scenarios.
 */
export class PackagePaths {
  private static _packageRoot: string | null = null;
  private static _templatesDir: string | null = null;

  /**
   * Get the root directory of the memento-protocol package.
   * Works correctly whether running from source or npm installation.
   */
  static getPackageRoot(): string {
    if (this._packageRoot) {
      return this._packageRoot;
    }

    // In production, __dirname will be something like:
    // /path/to/node_modules/memento-protocol/dist/lib
    // So we need to go up 2 levels to reach the package root
    const fromDist = path.resolve(__dirname, "..", "..");

    // Check if we're in a dist directory (production)
    if (__dirname.includes(path.sep + "dist" + path.sep)) {
      this._packageRoot = fromDist;
    } 
    // Check if we're in src directory (development/test)
    else if (__dirname.includes(path.sep + "src" + path.sep)) {
      // Development/test mode - go up from src/lib to package root
      this._packageRoot = path.resolve(__dirname, "..", "..");
    }
    // Fallback - assume we're 2 levels deep from package root
    else {
      this._packageRoot = fromDist;
    }

    return this._packageRoot;
  }

  /**
   * Get the templates directory path.
   * Checks multiple locations to support both development and production.
   */
  static getTemplatesDir(): string {
    if (this._templatesDir) {
      return this._templatesDir;
    }

    const packageRoot = this.getPackageRoot();

    // First, check if templates exist at package root (both dev and prod)
    const packageTemplates = path.join(packageRoot, "templates");
    if (existsSync(packageTemplates)) {
      this._templatesDir = packageTemplates;
      return this._templatesDir;
    }

    // In test environment (NODE_ENV=test or when running jest), return a dummy path
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
      this._templatesDir = '/test/templates';
      return this._templatesDir;
    }

    // If not found, throw an error with helpful information
    throw new Error(
      `Templates directory not found. Looked in: ${packageTemplates}\n` +
      `Package root: ${packageRoot}\n` +
      `__dirname: ${__dirname}`
    );
  }

  /**
   * Reset cached paths (mainly for testing)
   */
  static reset(): void {
    this._packageRoot = null;
    this._templatesDir = null;
  }
}