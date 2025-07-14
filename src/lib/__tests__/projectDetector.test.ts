import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectDetector } from '../projectDetector';

jest.mock('fs/promises');
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
    detector = new ProjectDetector(mockProjectRoot);
  });

  describe('detect', () => {
    it('should detect TypeScript project with React', async () => {
      jest.mocked(fs.access).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'package.json' || fileName === 'tsconfig.json') {
          return Promise.resolve();
        }
        throw new Error('ENOENT');
      });

      jest.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'package.json') {
          return JSON.stringify({
            dependencies: { react: '^18.0.0' }
          });
        }
        throw new Error('ENOENT');
      });

      const result = await detector.detect();

      expect(result.type).toBe('typescript');
      expect(result.framework).toBe('react');
      expect(result.suggestedWorkflows).toContain('refactor');
      expect(result.suggestedWorkflows).toContain('debug');
    });

    it('should detect JavaScript project with Express', async () => {
      jest.mocked(fs.access).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'package.json') {
          return Promise.resolve();
        }
        throw new Error('ENOENT');
      });

      jest.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'package.json') {
          return JSON.stringify({
            dependencies: { express: '^4.18.0' }
          });
        }
        throw new Error('ENOENT');
      });

      const result = await detector.detect();

      expect(result.type).toBe('javascript');
      expect(result.framework).toBe('express');
      expect(result.suggestedWorkflows).toContain('api-design');
    });

    it('should detect Go project with Gin', async () => {
      jest.mocked(fs.access).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'go.mod') {
          return Promise.resolve();
        }
        throw new Error('ENOENT');
      });

      jest.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'go.mod') {
          return `module myapp

go 1.21

require github.com/gin-gonic/gin v1.9.0`;
        }
        throw new Error('ENOENT');
      });

      const result = await detector.detect();

      expect(result.type).toBe('go');
      expect(result.framework).toBe('gin');
      expect(result.suggestedWorkflows).toContain('api-design');
      expect(result.suggestedWorkflows).toContain('test-generation');
    });

    it('should detect vanilla Go project', async () => {
      jest.mocked(fs.access).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'go.mod') {
          return Promise.resolve();
        }
        throw new Error('ENOENT');
      });

      jest.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fileName = path.basename(filePath as string);
        if (fileName === 'go.mod') {
          return `module myapp

go 1.21`;
        }
        throw new Error('ENOENT');
      });

      const result = await detector.detect();

      expect(result.type).toBe('go');
      expect(result.framework).toBe('vanilla');
      expect(result.suggestedWorkflows).toContain('test-generation');
    });

    it('should return unknown type for unrecognized projects', async () => {
      jest.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      jest.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const result = await detector.detect();

      expect(result.type).toBe('unknown');
      expect(result.suggestedModes).toEqual(['project-manager', 'architect', 'engineer', 'reviewer']);
      expect(result.suggestedWorkflows).toEqual(['summarize', 'review']);
    });
  });

  describe('getRecommendations', () => {
    it('should provide TypeScript-specific recommendations', () => {
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

      expect(recommendations).toContain('TypeScript detected - type-safe patterns will be used');
      expect(recommendations).toContain('React detected - component-based workflows available');
    });

    it('should provide Go-specific recommendations', () => {
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

      expect(recommendations).toContain('Go detected - idiomatic Go patterns will be used');
      expect(recommendations).toContain('Gin framework detected - REST API patterns available');
    });
  });
});