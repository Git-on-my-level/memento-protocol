import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { DirectoryManager } from './directoryManager';
import { logger } from './logger';

interface LanguageOverride {
  language: string;
  extensions: string[];
  workflows: {
    [workflowName: string]: {
      preSteps?: string[];
      postSteps?: string[];
      replaceSteps?: { [stepName: string]: string };
      tools?: string[];
    };
  };
  modes?: {
    [modeName: string]: {
      additionalContext?: string;
      overrides?: { [key: string]: string };
    };
  };
}

export class LanguageOverrideManager {
  private dirManager: DirectoryManager;
  private projectRoot: string;
  private languageCache: Map<string, LanguageOverride> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.dirManager = new DirectoryManager(projectRoot);
  }

  /**
   * Detect the primary language of the project
   */
  async detectProjectLanguage(): Promise<string | null> {
    // Check for language-specific config files
    const languageDetectors: { [key: string]: string[] } = {
      typescript: ['tsconfig.json', 'tsconfig.base.json'],
      javascript: ['package.json', '.eslintrc.js', '.eslintrc.json'],
      python: ['setup.py', 'pyproject.toml', 'requirements.txt', 'Pipfile'],
      go: ['go.mod', 'go.sum'],
      rust: ['Cargo.toml', 'Cargo.lock'],
      java: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
      csharp: ['*.csproj', '*.sln'],
      ruby: ['Gemfile', 'Gemfile.lock', '.ruby-version'],
      php: ['composer.json', 'composer.lock'],
      swift: ['Package.swift', '*.xcodeproj'],
    };

    for (const [language, files] of Object.entries(languageDetectors)) {
      for (const file of files) {
        const filePath = path.join(this.projectRoot, file);
        
        // Handle glob patterns
        if (file.includes('*')) {
          try {
            const dir = await fs.readdir(this.projectRoot);
            const pattern = file.replace('*', '.*');
            const regex = new RegExp(pattern);
            
            if (dir.some(f => regex.test(f))) {
              return language;
            }
          } catch {
            // Ignore read errors
          }
        } else if (existsSync(filePath)) {
          return language;
        }
      }
    }

    // Check for TypeScript specifically in JavaScript projects
    if (existsSync(path.join(this.projectRoot, 'package.json'))) {
      try {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8')
        );
        
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if ('typescript' in deps || '@types/node' in deps) {
          return 'typescript';
        }
        
        return 'javascript';
      } catch {
        return 'javascript';
      }
    }

    return null;
  }

  /**
   * Load language override configuration
   */
  async loadLanguageOverride(language: string): Promise<LanguageOverride | null> {
    // Check cache first
    if (this.languageCache.has(language)) {
      return this.languageCache.get(language)!;
    }

    const overridePath = this.dirManager.getComponentPath('languages', language);
    
    if (!existsSync(overridePath)) {
      return null;
    }

    try {
      const content = await fs.readFile(overridePath, 'utf-8');
      const override = this.parseLanguageOverride(content);
      
      this.languageCache.set(language, override);
      return override;
    } catch (error) {
      logger.error(`Failed to load language override for ${language}: ${error}`);
      return null;
    }
  }

  /**
   * Apply language overrides to a workflow
   */
  async applyWorkflowOverrides(workflowName: string, workflowContent: string): Promise<string> {
    const language = await this.detectProjectLanguage();
    
    if (!language) {
      return workflowContent;
    }

    const override = await this.loadLanguageOverride(language);
    
    if (!override || !override.workflows[workflowName]) {
      return workflowContent;
    }

    const workflowOverride = override.workflows[workflowName];
    let modifiedContent = workflowContent;

    // Apply pre-steps
    if (workflowOverride.preSteps && workflowOverride.preSteps.length > 0) {
      const preStepsSection = `\n## Language-Specific Pre-Steps (${language})\n\n${workflowOverride.preSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n`;
      modifiedContent = modifiedContent.replace(/## Steps/, preStepsSection + '\n## Steps');
    }

    // Apply post-steps
    if (workflowOverride.postSteps && workflowOverride.postSteps.length > 0) {
      const postStepsSection = `\n## Language-Specific Post-Steps (${language})\n\n${workflowOverride.postSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n`;
      modifiedContent += postStepsSection;
    }

    // Apply step replacements
    if (workflowOverride.replaceSteps) {
      for (const [stepName, replacement] of Object.entries(workflowOverride.replaceSteps)) {
        const stepRegex = new RegExp(`\\d+\\.\\s*${stepName}.*`, 'gi');
        modifiedContent = modifiedContent.replace(stepRegex, (match) => {
          const stepNumber = match.match(/^\d+/)?.[0] || '1';
          return `${stepNumber}. ${replacement}`;
        });
      }
    }

    // Add recommended tools
    if (workflowOverride.tools && workflowOverride.tools.length > 0) {
      const toolsSection = `\n## Recommended Tools (${language})\n\n${workflowOverride.tools.map(tool => `- ${tool}`).join('\n')}\n`;
      modifiedContent += toolsSection;
    }

    return modifiedContent;
  }

  /**
   * Apply language overrides to a mode
   */
  async applyModeOverrides(modeName: string, modeContent: string): Promise<string> {
    const language = await this.detectProjectLanguage();
    
    if (!language) {
      return modeContent;
    }

    const override = await this.loadLanguageOverride(language);
    
    if (!override || !override.modes || !override.modes[modeName]) {
      return modeContent;
    }

    const modeOverride = override.modes[modeName];
    let modifiedContent = modeContent;

    // Add additional context
    if (modeOverride.additionalContext) {
      const contextSection = `\n## Language-Specific Context (${language})\n\n${modeOverride.additionalContext}\n`;
      modifiedContent = modifiedContent.replace(/## Context/, '## Context' + contextSection);
    }

    // Apply overrides
    if (modeOverride.overrides) {
      for (const [key, value] of Object.entries(modeOverride.overrides)) {
        modifiedContent = modifiedContent.replace(new RegExp(key, 'g'), value);
      }
    }

    return modifiedContent;
  }

  /**
   * List available language overrides
   */
  async listAvailableOverrides(): Promise<string[]> {
    const templatesDir = path.join(
      path.dirname(require.main?.filename || __dirname),
      'templates',
      'languages'
    );

    if (!existsSync(templatesDir)) {
      return [];
    }

    try {
      const files = await fs.readdir(templatesDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));
    } catch {
      return [];
    }
  }

  /**
   * Install a language override
   */
  async installLanguageOverride(language: string): Promise<void> {
    const available = await this.listAvailableOverrides();
    
    if (!available.includes(language)) {
      throw new Error(`Language override for '${language}' not found`);
    }

    const templatePath = path.join(
      path.dirname(require.main?.filename || __dirname),
      'templates',
      'languages',
      `${language}.md`
    );

    const content = await fs.readFile(templatePath, 'utf-8');
    const destPath = this.dirManager.getComponentPath('languages', language);
    
    await fs.writeFile(destPath, content);

    // Update manifest
    const manifest = await this.dirManager.getManifest();
    if (!manifest.components.languages[language]) {
      manifest.components.languages[language] = {
        installed: new Date().toISOString(),
        version: '1.0.0'
      };
      manifest.components.updated = new Date().toISOString();
      await this.dirManager.updateManifest(manifest);
    }

    logger.success(`Installed language override for ${language}`);
  }

  /**
   * Parse language override from markdown content
   */
  private parseLanguageOverride(content: string): LanguageOverride {
    // This is a simplified parser. In a real implementation,
    // you might want to use a proper markdown parser or YAML frontmatter
    const lines = content.split('\n');
    const override: LanguageOverride = {
      language: '',
      extensions: [],
      workflows: {},
      modes: {}
    };

    let currentSection = '';
    let currentWorkflow = '';
    let currentMode = '';

    for (const line of lines) {
      if (line.startsWith('# Language:')) {
        override.language = line.replace('# Language:', '').trim();
      } else if (line.startsWith('## Extensions:')) {
        currentSection = 'extensions';
      } else if (line.startsWith('## Workflow:')) {
        currentSection = 'workflow';
        currentWorkflow = line.replace('## Workflow:', '').trim();
        override.workflows[currentWorkflow] = {};
      } else if (line.startsWith('## Mode:')) {
        currentSection = 'mode';
        currentMode = line.replace('## Mode:', '').trim();
        override.modes![currentMode] = {};
      } else if (line.startsWith('### Pre-Steps:')) {
        currentSection = 'preSteps';
        override.workflows[currentWorkflow].preSteps = [];
      } else if (line.startsWith('### Post-Steps:')) {
        currentSection = 'postSteps';
        override.workflows[currentWorkflow].postSteps = [];
      } else if (line.startsWith('### Replace Steps:')) {
        currentSection = 'replaceSteps';
        override.workflows[currentWorkflow].replaceSteps = {};
      } else if (line.startsWith('### Tools:')) {
        currentSection = 'tools';
        override.workflows[currentWorkflow].tools = [];
      } else if (line.startsWith('### Additional Context:')) {
        currentSection = 'additionalContext';
      } else if (line.trim() && !line.startsWith('#')) {
        // Process content based on current section
        if (currentSection === 'extensions' && line.startsWith('-')) {
          override.extensions.push(line.replace('-', '').trim());
        } else if (currentSection === 'preSteps' && line.match(/^\d+\./)) {
          override.workflows[currentWorkflow].preSteps!.push(
            line.replace(/^\d+\./, '').trim()
          );
        } else if (currentSection === 'postSteps' && line.match(/^\d+\./)) {
          override.workflows[currentWorkflow].postSteps!.push(
            line.replace(/^\d+\./, '').trim()
          );
        } else if (currentSection === 'tools' && line.startsWith('-')) {
          override.workflows[currentWorkflow].tools!.push(
            line.replace('-', '').trim()
          );
        }
      }
    }

    return override;
  }

  /**
   * Auto-detect and install appropriate language override
   */
  async autoInstallLanguageOverride(): Promise<string | null> {
    const detectedLanguage = await this.detectProjectLanguage();
    
    if (!detectedLanguage) {
      logger.info('Could not detect project language');
      return null;
    }

    logger.info(`Detected project language: ${detectedLanguage}`);

    const available = await this.listAvailableOverrides();
    
    if (available.includes(detectedLanguage)) {
      await this.installLanguageOverride(detectedLanguage);
      return detectedLanguage;
    } else {
      logger.warn(`No language override available for ${detectedLanguage}`);
      return null;
    }
  }
}