import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentFileGenerator, AgentConfig } from '../agentFileGenerator';

describe('AgentFileGenerator', () => {
  const testDir = path.join(__dirname, 'test-project');
  let generator: AgentFileGenerator;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.memento'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'templates', 'agents'), { recursive: true });
    
    // Create a simple test template
    const testTemplate = `# {{PROJECT_NAME}}

This is a test template for {{AGENT_NAME}}.

Project: {{PROJECT_DESCRIPTION}}

{{CUSTOM_CONTENT}}
`;
    await fs.writeFile(
      path.join(testDir, 'templates', 'agents', 'test.md'),
      testTemplate
    );

    generator = new AgentFileGenerator(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should generate agent file with replaced placeholders', async () => {
      const agentConfig: AgentConfig = {
        id: 'test',
        name: 'Test Agent',
        description: 'Test agent for unit tests',
        targetFilename: 'TEST.md',
        templatePath: path.join(testDir, 'templates', 'agents', 'test.md'),
        placeholders: {}
      };

      const placeholderValues = {
        PROJECT_NAME: 'My Test Project',
        AGENT_NAME: 'Test Agent',
        PROJECT_DESCRIPTION: 'A test project',
        CUSTOM_CONTENT: 'This is custom content'
      };

      await generator.generate(agentConfig, placeholderValues);

      // Verify file was created
      const content = await fs.readFile(
        path.join(testDir, 'TEST.md'),
        'utf-8'
      );

      expect(content).toContain('# My Test Project');
      expect(content).toContain('This is a test template for Test Agent');
      expect(content).toContain('Project: A test project');
      expect(content).toContain('This is custom content');
    });

    it('should handle missing placeholders gracefully', async () => {
      const agentConfig: AgentConfig = {
        id: 'test',
        name: 'Test Agent',
        description: 'Test agent for unit tests',
        targetFilename: 'TEST.md',
        templatePath: path.join(testDir, 'templates', 'agents', 'test.md'),
        placeholders: {}
      };

      const placeholderValues = {
        PROJECT_NAME: 'My Test Project'
        // Missing other placeholders
      };

      await generator.generate(agentConfig, placeholderValues);

      // Verify file was created with empty placeholders replaced
      const content = await fs.readFile(
        path.join(testDir, 'TEST.md'),
        'utf-8'
      );

      expect(content).toContain('# My Test Project');
      expect(content).not.toContain('{{');
      expect(content).not.toContain('}}');
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      await fs.writeFile(path.join(testDir, 'EXISTING.md'), 'content');
      
      const exists = await generator.exists('EXISTING.md');
      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const exists = await generator.exists('NONEXISTENT.md');
      expect(exists).toBe(false);
    });
  });

  describe('readExisting', () => {
    it('should read existing file content', async () => {
      const testContent = 'This is existing content';
      await fs.writeFile(path.join(testDir, 'EXISTING.md'), testContent);
      
      const content = await generator.readExisting('EXISTING.md');
      expect(content).toBe(testContent);
    });

    it('should return null for non-existent file', async () => {
      const content = await generator.readExisting('NONEXISTENT.md');
      expect(content).toBeNull();
    });
  });
});