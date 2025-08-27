import { ensureDirectory, ensureDirectorySync } from '../filesystem';
import { mkdirSync, existsSync, rmSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Filesystem utilities', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `filesystem-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('ensureDirectory', () => {
    it('should create a directory if it does not exist', async () => {
      const targetDir = path.join(testDir, 'new-directory');
      
      expect(existsSync(targetDir)).toBe(false);
      await ensureDirectory(targetDir);
      expect(existsSync(targetDir)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      mkdirSync(testDir, { recursive: true });
      
      // Should not throw
      await ensureDirectory(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const nestedDir = path.join(testDir, 'level1', 'level2', 'level3');
      
      await ensureDirectory(nestedDir);
      expect(existsSync(nestedDir)).toBe(true);
    });
  });

  describe('ensureDirectorySync', () => {
    it('should create a directory if it does not exist', () => {
      const targetDir = path.join(testDir, 'new-directory-sync');
      
      expect(existsSync(targetDir)).toBe(false);
      ensureDirectorySync(targetDir);
      expect(existsSync(targetDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      mkdirSync(testDir, { recursive: true });
      
      // Should not throw
      ensureDirectorySync(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it('should create nested directories recursively', () => {
      const nestedDir = path.join(testDir, 'level1', 'level2', 'level3');
      
      ensureDirectorySync(nestedDir);
      expect(existsSync(nestedDir)).toBe(true);
    });
  });
});