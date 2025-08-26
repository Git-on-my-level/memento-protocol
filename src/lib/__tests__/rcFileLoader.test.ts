import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { RCFileLoader } from '../rcFileLoader';
import { ConfigMigrator } from '../ConfigMigrator';

describe('RCFileLoader', () => {
  let tempDir: string;
  let rcFileLoader: RCFileLoader;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = path.join(os.tmpdir(), 'memento-rc-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'home'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'project'), { recursive: true });
    
    rcFileLoader = new RCFileLoader();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('discoverRCFiles', () => {
    it('should discover RC files in home and project directories', () => {
      const homeDir = path.join(tempDir, 'home');
      const projectDir = path.join(tempDir, 'project');

      const rcFiles = rcFileLoader.discoverRCFiles({
        homeDirectory: homeDir,
        projectDirectory: projectDir
      });

      expect(rcFiles).toHaveLength(8); // 4 global + 4 project

      // Check global files
      expect(rcFiles[0].path).toBe(path.join(homeDir, '.mementorc'));
      expect(rcFiles[0].format).toBe('yaml');
      expect(rcFiles[1].path).toBe(path.join(homeDir, '.mementorc.yaml'));
      expect(rcFiles[1].format).toBe('yaml');
      expect(rcFiles[2].path).toBe(path.join(homeDir, '.mementorc.yml'));
      expect(rcFiles[2].format).toBe('yaml');
      expect(rcFiles[3].path).toBe(path.join(homeDir, '.mementorc.json'));
      expect(rcFiles[3].format).toBe('json');

      // Check project files
      expect(rcFiles[4].path).toBe(path.join(projectDir, '.mementorc'));
      expect(rcFiles[4].format).toBe('yaml');
      expect(rcFiles[5].path).toBe(path.join(projectDir, '.mementorc.yaml'));
      expect(rcFiles[5].format).toBe('yaml');
      expect(rcFiles[6].path).toBe(path.join(projectDir, '.mementorc.yml'));
      expect(rcFiles[6].format).toBe('yaml');
      expect(rcFiles[7].path).toBe(path.join(projectDir, '.mementorc.json'));
      expect(rcFiles[7].format).toBe('json');

      // All should be marked as not existing initially
      rcFiles.forEach(rcFile => {
        expect(rcFile.exists).toBe(false);
      });
    });

    it('should correctly detect existing files', () => {
      const homeDir = path.join(tempDir, 'home');
      const projectDir = path.join(tempDir, 'project');

      // Create some RC files
      fs.writeFileSync(path.join(homeDir, '.mementorc'), 'defaultMode: engineer');
      fs.writeFileSync(path.join(projectDir, '.mementorc.json'), '{"defaultMode": "architect"}');

      const rcFiles = rcFileLoader.discoverRCFiles({
        homeDirectory: homeDir,
        projectDirectory: projectDir
      });

      expect(rcFiles[0].exists).toBe(true);  // home/.mementorc
      expect(rcFiles[1].exists).toBe(false); // home/.mementorc.yaml
      expect(rcFiles[7].exists).toBe(true);  // project/.mementorc.json
    });
  });

  describe('loadRCFile', () => {
    it('should return null for non-existent files', async () => {
      const rcFile = {
        path: path.join(tempDir, 'nonexistent.yaml'),
        format: 'yaml' as const,
        exists: false
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      expect(result).toBeNull();
    });

    it('should parse YAML RC files correctly', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      const content = `
version: ${ConfigMigrator.getCurrentVersion()}
defaultMode: engineer
preferredWorkflows:
  - review
  - summarize
ui:
  colorOutput: true
  verboseLogging: false
components:
  modes:
    - engineer
    - architect
`;
      fs.writeFileSync(filePath, content);

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('engineer');
      expect(result!.preferredWorkflows).toEqual(['review', 'summarize']);
      expect(result!.ui?.colorOutput).toBe(true);
      expect(result!.components?.modes).toEqual(['engineer', 'architect']);
    });

    it('should parse JSON RC files correctly', async () => {
      const filePath = path.join(tempDir, '.mementorc.json');
      const config = {
        version: ConfigMigrator.getCurrentVersion(),
        defaultMode: 'architect',
        ui: {
          colorOutput: false,
          verboseLogging: true
        }
      };
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));

      const rcFile = {
        path: filePath,
        format: 'json' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('architect');
      expect(result!.ui?.colorOutput).toBe(false);
      expect(result!.ui?.verboseLogging).toBe(true);
    });

    it('should handle empty YAML files gracefully', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, '');

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      expect(result).toBeNull();
    });

    it('should handle YAML files with null content', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, '~\n');

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      expect(result).toBeNull();
    });

    it('should throw error for invalid YAML structure', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, '- not an object\n- but an array');

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      await expect(rcFileLoader.loadRCFile(rcFile)).rejects.toThrow('Invalid YAML structure');
    });

    it('should throw error for invalid JSON syntax', async () => {
      const filePath = path.join(tempDir, '.mementorc.json');
      fs.writeFileSync(filePath, '{ invalid: json }');

      const rcFile = {
        path: filePath,
        format: 'json' as const,
        exists: true
      };

      await expect(rcFileLoader.loadRCFile(rcFile)).rejects.toThrow('Failed to parse JSON RC file');
    });

    it('should throw error for invalid YAML syntax', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, 'invalid: yaml: syntax: [');

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      await expect(rcFileLoader.loadRCFile(rcFile)).rejects.toThrow('Failed to parse YAML RC file');
    });

    it('should add version if missing for backward compatibility', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      const content = `
defaultMode: engineer
ui:
  colorOutput: true
`;
      fs.writeFileSync(filePath, content);

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      
      expect(result).toBeDefined();
      expect(result!.version).toBe(ConfigMigrator.getCurrentVersion());
    });
  });

  describe('loadFirstAvailableRC', () => {
    it('should return null when no RC files exist', async () => {
      const rcFiles = rcFileLoader.discoverRCFiles({
        homeDirectory: path.join(tempDir, 'home'),
        projectDirectory: path.join(tempDir, 'project')
      });

      const result = await rcFileLoader.loadFirstAvailableRC(rcFiles);
      expect(result).toBeNull();
    });

    it('should load the first available RC file', async () => {
      const homeDir = path.join(tempDir, 'home');
      
      // Create multiple RC files
      fs.writeFileSync(path.join(homeDir, '.mementorc.yaml'), 'defaultMode: yaml-engineer');
      fs.writeFileSync(path.join(homeDir, '.mementorc.json'), '{"defaultMode": "json-engineer"}');

      const rcFiles = rcFileLoader.discoverRCFiles({ homeDirectory: homeDir });
      const globalFiles = rcFiles.slice(0, 4);

      const result = await rcFileLoader.loadFirstAvailableRC(globalFiles);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('yaml-engineer'); // .mementorc.yaml comes before .mementorc.json in order
    });

    it('should skip files with parsing errors and try the next one', async () => {
      const homeDir = path.join(tempDir, 'home');
      
      // Create RC files - first one invalid, second one valid
      fs.writeFileSync(path.join(homeDir, '.mementorc'), 'invalid: yaml: [');
      fs.writeFileSync(path.join(homeDir, '.mementorc.yaml'), 'defaultMode: valid-engineer');

      const rcFiles = rcFileLoader.discoverRCFiles({ homeDirectory: homeDir });
      const globalFiles = rcFiles.slice(0, 4);

      const result = await rcFileLoader.loadFirstAvailableRC(globalFiles);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('valid-engineer');
    });
  });

  describe('loadGlobalRC', () => {
    it('should load global RC configuration', async () => {
      const homeDir = path.join(tempDir, 'home');
      fs.writeFileSync(path.join(homeDir, '.mementorc'), 'defaultMode: global-engineer');

      const result = await rcFileLoader.loadGlobalRC(homeDir);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('global-engineer');
    });

    it('should return null when no global RC files exist', async () => {
      const homeDir = path.join(tempDir, 'home');

      const result = await rcFileLoader.loadGlobalRC(homeDir);
      expect(result).toBeNull();
    });
  });

  describe('loadProjectRC', () => {
    it('should load project RC configuration', async () => {
      const projectDir = path.join(tempDir, 'project');
      fs.writeFileSync(path.join(projectDir, '.mementorc'), 'defaultMode: project-engineer');

      const result = await rcFileLoader.loadProjectRC(projectDir);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('project-engineer');
    });

    it('should return null when no project RC files exist', async () => {
      const projectDir = path.join(tempDir, 'project');

      const result = await rcFileLoader.loadProjectRC(projectDir);
      expect(result).toBeNull();
    });
  });

  describe('getRCFileStatus', () => {
    it('should return status of RC files', () => {
      const homeDir = path.join(tempDir, 'home');
      const projectDir = path.join(tempDir, 'project');

      // Create some files
      fs.writeFileSync(path.join(homeDir, '.mementorc'), 'test');
      fs.writeFileSync(path.join(projectDir, '.mementorc.json'), '{}');

      const status = rcFileLoader.getRCFileStatus({
        homeDirectory: homeDir,
        projectDirectory: projectDir
      });

      expect(status.global).toHaveLength(4);
      expect(status.project).toHaveLength(4);
      expect(status.global[0].exists).toBe(true);  // .mementorc
      expect(status.global[1].exists).toBe(false); // .mementorc.yaml
      expect(status.project[3].exists).toBe(true); // .mementorc.json
    });
  });

  describe('validateRCFile', () => {
    it('should validate a correct YAML RC file', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      const content = `
version: ${ConfigMigrator.getCurrentVersion()}
defaultMode: engineer
ui:
  colorOutput: true
  verboseLogging: false
`;
      fs.writeFileSync(filePath, content);

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.format).toBe('yaml');
    });

    it('should validate a correct JSON RC file', async () => {
      const filePath = path.join(tempDir, '.mementorc.json');
      const config = {
        version: ConfigMigrator.getCurrentVersion(),
        defaultMode: 'engineer',
        ui: { colorOutput: true }
      };
      fs.writeFileSync(filePath, JSON.stringify(config));

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.format).toBe('json');
    });

    it('should return errors for invalid configuration', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      const content = `
defaultMode: 123
ui:
  colorOutput: "not a boolean"
`;
      fs.writeFileSync(filePath, content);

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.format).toBe('yaml');
    });

    it('should return error for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.yaml');

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`RC file not found: ${filePath}`);
    });

    it('should return error for empty YAML file', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, '');

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty YAML file');
      expect(result.format).toBe('yaml');
    });

    it('should return error for YAML array at root level', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      fs.writeFileSync(filePath, '- item1\n- item2');

      const result = await rcFileLoader.validateRCFile(filePath);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('YAML must contain an object at the root level');
      expect(result.format).toBe('yaml');
    });
  });

  describe('generateSampleRC', () => {
    it('should generate valid YAML sample', () => {
      const yamlSample = rcFileLoader.generateSampleRC('yaml');
      
      expect(yamlSample).toContain('version:');
      expect(yamlSample).toContain('defaultMode:');
      expect(yamlSample).toContain('ui:');
      
      // Should be parseable as YAML
      const parsed = yaml.load(yamlSample);
      expect(parsed).toBeInstanceOf(Object);
      expect((parsed as any).defaultMode).toBeDefined();
    });

    it('should generate valid JSON sample', () => {
      const jsonSample = rcFileLoader.generateSampleRC('json');
      
      expect(jsonSample).toContain('"version"');
      expect(jsonSample).toContain('"defaultMode"');
      expect(jsonSample).toContain('"ui"');
      
      // Should be parseable as JSON
      const parsed = JSON.parse(jsonSample);
      expect(parsed).toBeInstanceOf(Object);
      expect(parsed.defaultMode).toBeDefined();
    });

    it('should default to YAML format', () => {
      const defaultSample = rcFileLoader.generateSampleRC();
      const yamlSample = rcFileLoader.generateSampleRC('yaml');
      
      expect(defaultSample).toBe(yamlSample);
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed YAML and JSON files with proper precedence', async () => {
      const homeDir = path.join(tempDir, 'home');
      const projectDir = path.join(tempDir, 'project');
      
      // Create files in precedence order (earlier files should win)
      fs.writeFileSync(path.join(homeDir, '.mementorc'), 'defaultMode: home-yaml');
      fs.writeFileSync(path.join(homeDir, '.mementorc.json'), '{"defaultMode": "home-json"}');
      fs.writeFileSync(path.join(projectDir, '.mementorc'), 'defaultMode: project-yaml');
      fs.writeFileSync(path.join(projectDir, '.mementorc.json'), '{"defaultMode": "project-json"}');

      // Test global precedence (.mementorc should win over .mementorc.json)
      const globalResult = await rcFileLoader.loadGlobalRC(homeDir);
      expect(globalResult!.defaultMode).toBe('home-yaml');

      // Test project precedence
      const projectResult = await rcFileLoader.loadProjectRC(projectDir);
      expect(projectResult!.defaultMode).toBe('project-yaml');
    });

    it('should handle complex configuration structures', async () => {
      const filePath = path.join(tempDir, '.mementorc');
      const content = `
version: ${ConfigMigrator.getCurrentVersion()}
defaultMode: engineer
preferredWorkflows:
  - review
  - summarize
  - openmemory-setup
customTemplateSources:
  - https://example.com/templates
  - /local/path/templates
integrations:
  git:
    autoCommit: false
    signCommits: true
  slack:
    webhook: https://hooks.slack.com/example
    channel: "#dev-notifications"
ui:
  colorOutput: true
  verboseLogging: false
components:
  modes:
    - engineer
    - architect
    - reviewer
  workflows:
    - review
    - summarize
`;
      fs.writeFileSync(filePath, content);

      const rcFile = {
        path: filePath,
        format: 'yaml' as const,
        exists: true
      };

      const result = await rcFileLoader.loadRCFile(rcFile);
      
      expect(result).toBeDefined();
      expect(result!.defaultMode).toBe('engineer');
      expect(result!.preferredWorkflows).toEqual(['review', 'summarize', 'openmemory-setup']);
      expect(result!.customTemplateSources).toEqual(['https://example.com/templates', '/local/path/templates']);
      expect(result!.integrations?.git?.autoCommit).toBe(false);
      expect(result!.integrations?.slack?.channel).toBe('#dev-notifications');
      expect(result!.ui?.colorOutput).toBe(true);
      expect(result!.components?.modes).toEqual(['engineer', 'architect', 'reviewer']);
    });
  });
});