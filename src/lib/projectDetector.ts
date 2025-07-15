import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export interface ProjectInfo {
  type: 'typescript' | 'javascript' | 'go' | 'unknown' | 'web' | 'backend' | 'fullstack' | 'cli' | 'library';
  framework?: 'react' | 'express' | 'gin' | 'vanilla' | 'vue' | 'angular' | 'nextjs' | 'nuxt';
  suggestedModes: string[];
  suggestedWorkflows: string[];
  files: string[];
  dependencies: Record<string, any>;
}

export class ProjectDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Detect project type and suggest relevant components
   */
  async detect(): Promise<ProjectInfo> {
    const projectInfo: ProjectInfo = {
      type: 'unknown',
      suggestedModes: [], // Empty array - all modes are selected by default in interactive setup
      suggestedWorkflows: ['summarize', 'review'],
      files: [],
      dependencies: {}
    };

    // Detect TypeScript/JavaScript projects
    if (await this.fileExists('package.json')) {
      const packageJson = await this.readJsonFile('package.json');
      projectInfo.type = await this.fileExists('tsconfig.json') ? 'typescript' : 'javascript';
      projectInfo.dependencies = packageJson.dependencies || {};

      // Detect React
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        projectInfo.framework = 'react';
        projectInfo.suggestedWorkflows.push('refactor', 'debug');
      }
      // Detect Express
      else if (packageJson.dependencies?.express || packageJson.devDependencies?.express) {
        projectInfo.framework = 'express';
        projectInfo.suggestedWorkflows.push('api-design');
      }
    }
    // Detect Go projects
    else if (await this.fileExists('go.mod')) {
      projectInfo.type = 'go';
      
      const goMod = await this.readFile('go.mod');
      // Detect Gin framework
      if (goMod && goMod.includes('github.com/gin-gonic/gin')) {
        projectInfo.framework = 'gin';
        projectInfo.suggestedWorkflows.push('api-design');
      } else {
        projectInfo.framework = 'vanilla';
      }
      
      projectInfo.suggestedWorkflows.push('test-generation');
    }

    // Check for existing CLAUDE.md
    const existingClaudeMd = await this.readFile('CLAUDE.md');
    if (existingClaudeMd) {
      logger.info('Existing CLAUDE.md detected - will preserve project-specific content');
    }

    return projectInfo;
  }

  /**
   * Get recommended components based on project type
   */
  getRecommendations(projectInfo: ProjectInfo): string[] {
    const recommendations: string[] = [];

    // Base recommendations - simplified since all components are selected by default
    recommendations.push('All modes will be selected by default');
    recommendations.push('All workflows will be selected by default');

    // Type-specific recommendations
    if (projectInfo.type === 'typescript') {
      recommendations.push('TypeScript detected - type-safe patterns will be used');
    } else if (projectInfo.type === 'go') {
      recommendations.push('Go detected - idiomatic Go patterns will be used');
    }

    // Framework-specific recommendations
    if (projectInfo.framework === 'react') {
      recommendations.push('React detected - component-based workflows available');
    } else if (projectInfo.framework === 'gin') {
      recommendations.push('Gin framework detected - REST API patterns available');
    }

    return recommendations;
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, filename));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a file's content
   */
  private async readFile(filename: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.projectRoot, filename), 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Read and parse a JSON file
   */
  private async readJsonFile(filename: string): Promise<any> {
    try {
      const content = await fs.readFile(path.join(this.projectRoot, filename), 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
}