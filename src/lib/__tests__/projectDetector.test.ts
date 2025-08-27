import { ProjectDetector } from '../projectDetector';
import { createTestFileSystem } from '../testing';

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ProjectDetector', () => {
  const mockProjectRoot = '/test/project';
  let detector: ProjectDetector;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detect', () => {
    it('should detect TypeScript project with React', async () => {
      const fs = await createTestFileSystem({
        [`${mockProjectRoot}/package.json`]: JSON.stringify({
          dependencies: { react: '^18.0.0' }
        }),
        [`${mockProjectRoot}/tsconfig.json`]: '{}'
      });
      detector = new ProjectDetector(mockProjectRoot, fs);

      const result = await detector.detect();

      expect(result.type).toBe('typescript');
      expect(result.framework).toBe('react');
      expect(result.suggestedWorkflows).toContain('refactor');
      expect(result.suggestedWorkflows).toContain('debug');
    });

    it('should detect JavaScript project with Express', async () => {
      const fs = await createTestFileSystem({
        [`${mockProjectRoot}/package.json`]: JSON.stringify({
          dependencies: { express: '^4.18.0' }
        })
      });
      detector = new ProjectDetector(mockProjectRoot, fs);

      const result = await detector.detect();

      expect(result.type).toBe('javascript');
      expect(result.framework).toBe('express');
      expect(result.suggestedWorkflows).toContain('api-design');
    });

    it('should detect Go project with Gin', async () => {
      const fs = await createTestFileSystem({
        [`${mockProjectRoot}/go.mod`]: `module myapp

go 1.21

require github.com/gin-gonic/gin v1.9.0`
      });
      detector = new ProjectDetector(mockProjectRoot, fs);

      const result = await detector.detect();

      expect(result.type).toBe('go');
      expect(result.framework).toBe('gin');
      expect(result.suggestedWorkflows).toContain('api-design');
      expect(result.suggestedWorkflows).toContain('test-generation');
    });

    it('should detect vanilla Go project', async () => {
      const fs = await createTestFileSystem({
        [`${mockProjectRoot}/go.mod`]: `module myapp

go 1.21`
      });
      detector = new ProjectDetector(mockProjectRoot, fs);

      const result = await detector.detect();

      expect(result.type).toBe('go');
      expect(result.framework).toBe('vanilla');
      expect(result.suggestedWorkflows).toContain('test-generation');
    });

    it('should return unknown type for unrecognized projects', async () => {
      const fs = await createTestFileSystem({}); // Empty filesystem
      detector = new ProjectDetector(mockProjectRoot, fs);

      const result = await detector.detect();

      expect(result.type).toBe('unknown');
      expect(result.suggestedModes).toEqual([]);
      expect(result.suggestedWorkflows).toEqual(['summarize', 'review']);
    });
  });

  describe('getRecommendations', () => {
    it('should provide TypeScript-specific recommendations', async () => {
      const fs = await createTestFileSystem({});
      detector = new ProjectDetector(mockProjectRoot, fs);
      const projectInfo = {
        type: 'typescript' as const,
        framework: 'react' as const,
        languages: ['typescript'],
        suggestedModes: ['engineer'],
        suggestedWorkflows: ['review'],
        files: [],
        dependencies: {}
      };

      const recommendations = detector.getRecommendations(projectInfo);

      expect(recommendations).toContain('All modes will be selected by default');
      expect(recommendations).toContain('All workflows will be selected by default');
      expect(recommendations).toContain('TypeScript detected - type-safe patterns will be used');
      expect(recommendations).toContain('React detected - component-based workflows available');
    });

    it('should provide Go-specific recommendations', async () => {
      const fs = await createTestFileSystem({});
      detector = new ProjectDetector(mockProjectRoot, fs);
      const projectInfo = {
        type: 'go' as const,
        framework: 'gin' as const,
        languages: ['go'],
        suggestedModes: ['engineer'],
        suggestedWorkflows: ['review'],
        files: [],
        dependencies: {}
      };

      const recommendations = detector.getRecommendations(projectInfo);

      expect(recommendations).toContain('All modes will be selected by default');
      expect(recommendations).toContain('All workflows will be selected by default');
      expect(recommendations).toContain('Go detected - idiomatic Go patterns will be used');
      expect(recommendations).toContain('Gin framework detected - REST API patterns available');
    });
  });
});