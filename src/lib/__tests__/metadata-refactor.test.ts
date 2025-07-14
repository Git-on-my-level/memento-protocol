import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

jest.mock('fs/promises');
jest.mock('fs');

describe('Metadata Refactor Integration', () => {
  const templatesDir = '/test/templates';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Global metadata.json', () => {
    it('should have correct structure for all template types', async () => {
      const globalMetadata = {
        version: '1.0.0',
        templates: {
          claude_router: {
            name: 'claude_router_template',
            description: 'Minimal router for Claude Code, managing on-demand instruction loading',
            tags: ['router', 'claude', 'core'],
            dependencies: []
          },
          modes: [
            {
              name: 'project-manager',
              description: 'Planning, coordination, and high-level decision making',
              tags: ['planning', 'coordination', 'management'],
              dependencies: []
            },
            {
              name: 'architect',
              description: 'System design, technical decisions, and architectural patterns',
              tags: ['design', 'architecture', 'patterns'],
              dependencies: []
            }
          ],
          workflows: [
            {
              name: 'summarize',
              description: 'Summarize code, directories, or concepts to compress context',
              tags: ['analysis', 'documentation', 'context'],
              dependencies: []
            },
            {
              name: 'review',
              description: 'Comprehensive code review and quality assessment',
              tags: ['quality', 'review', 'feedback'],
              dependencies: ['reviewer']
            }
          ]
        }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(globalMetadata));

      const content = await fs.readFile(path.join(templatesDir, 'metadata.json'), 'utf-8');
      const metadata = JSON.parse(content);

      // Verify structure
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('templates');
      expect(metadata.templates).toHaveProperty('claude_router');
      expect(metadata.templates).toHaveProperty('modes');
      expect(metadata.templates).toHaveProperty('workflows');

      // Verify claude_router metadata
      expect(metadata.templates.claude_router).toMatchObject({
        name: 'claude_router_template',
        description: expect.any(String),
        tags: expect.any(Array),
        dependencies: expect.any(Array)
      });

      // Verify modes array
      expect(Array.isArray(metadata.templates.modes)).toBe(true);
      expect(metadata.templates.modes.length).toBeGreaterThan(0);
      
      // Verify workflows array
      expect(Array.isArray(metadata.templates.workflows)).toBe(true);
      expect(metadata.templates.workflows.length).toBeGreaterThan(0);
    });

    it('should use single global version for all components', async () => {
      const globalMetadata = {
        version: '1.2.3',
        templates: {
          claude_router: { name: 'claude_router_template' },
          modes: [{ name: 'architect' }],
          workflows: [{ name: 'review' }]
        }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(globalMetadata));

      const content = await fs.readFile(path.join(templatesDir, 'metadata.json'), 'utf-8');
      const metadata = JSON.parse(content);

      // All components should use the global version
      expect(metadata.version).toBe('1.2.3');
      
      // Individual components should not have their own version
      expect(metadata.templates.claude_router.version).toBeUndefined();
      metadata.templates.modes.forEach((mode: any) => {
        expect(mode.version).toBeUndefined();
      });
      metadata.templates.workflows.forEach((workflow: any) => {
        expect(workflow.version).toBeUndefined();
      });
    });
  });

  describe('Legacy metadata cleanup', () => {
    it('should not have per-directory metadata files', async () => {
      // Verify old metadata files don't exist
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('modes/metadata.json') || path.includes('workflows/metadata.json')) {
          return false;
        }
        return true;
      });

      const modesMetadataExists = existsSync(path.join(templatesDir, 'modes', 'metadata.json'));
      const workflowsMetadataExists = existsSync(path.join(templatesDir, 'workflows', 'metadata.json'));

      expect(modesMetadataExists).toBe(false);
      expect(workflowsMetadataExists).toBe(false);
    });
  });
});