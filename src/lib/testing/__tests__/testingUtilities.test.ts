import {
  createTestFileSystem,
  createTestMementoProject,
  createMultiProjectTestFileSystem,
  assertFileExists,
  assertFileNotExists,
  assertDirectoryExists,
  assertFileContains,
  assertFileEquals,
  assertJsonFileContains,
  createDirectoryStructure,
  createFiles,
  createJsonFile,
  readDirectoryStructure,
  setupMementoProjectStructure,
  createSampleTicket,
  createSampleMode,
  populateMemoryFileSystem,
  getMemoryFileSystemContents,
  resetMemoryFileSystem
} from '../index';

/**
 * Tests for the testing utilities to ensure they work correctly.
 * 
 * These are meta-tests that verify our testing infrastructure is solid
 * before we use it to test other parts of the codebase.
 */

describe('Testing Utilities', () => {
  describe('createTestFileSystem', () => {
    it('should create empty filesystem', async () => {
      const fs = await createTestFileSystem();
      
      expect(fs).toBeDefined();
      expect(fs.existsSync('/')).toBe(true);
      const contents = fs.toJSON();
      expect(Object.keys(contents)).toHaveLength(0);
    });

    it('should create pre-populated filesystem', async () => {
      const fs = await createTestFileSystem({
        '/test.txt': 'test content',
        '/dir/nested.json': '{"key": "value"}'
      });
      
      expect(fs.existsSync('/test.txt')).toBe(true);
      expect(fs.existsSync('/dir/nested.json')).toBe(true);
      expect(fs.readFileSync('/test.txt', 'utf8')).toBe('test content');
      
      const jsonContent = JSON.parse(fs.readFileSync('/dir/nested.json', 'utf8') as string);
      expect(jsonContent).toEqual({ key: 'value' });
    });
  });

  describe('createTestMementoProject', () => {
    it('should create default project structure', async () => {
      const fs = await createTestMementoProject();
      
      // Check ZCC directories
      expect(fs.existsSync('/project/.zcc')).toBe(true);
      expect(fs.existsSync('/project/.zcc/config.json')).toBe(true);
      expect(fs.existsSync('/project/.zcc/modes')).toBe(true);
      expect(fs.existsSync('/project/.zcc/workflows')).toBe(true);
      expect(fs.existsSync('/project/.zcc/tickets/next')).toBe(true);
      expect(fs.existsSync('/project/.zcc/tickets/in-progress')).toBe(true);
      expect(fs.existsSync('/project/.zcc/tickets/done')).toBe(true);
      
      // Check Claude directories
      expect(fs.existsSync('/project/.claude')).toBe(true);
      expect(fs.existsSync('/project/.claude/agents')).toBe(true);
      expect(fs.existsSync('/project/.claude/commands')).toBe(true);
      
      // Check config content
      const config = JSON.parse(fs.readFileSync('/project/.zcc/config.json', 'utf8') as string);
      expect(config.version).toBe('1.0.0');
      expect(config.theme).toBe('default');
    });

    it('should accept custom project root', async () => {
      const fs = await createTestMementoProject('/custom-project');
      
      expect(fs.existsSync('/custom-project/.zcc')).toBe(true);
      expect(fs.existsSync('/custom-project/.zcc/config.json')).toBe(true);
      expect(fs.existsSync('/custom-project/package.json')).toBe(true);
    });

    it('should merge custom files', async () => {
      const fs = await createTestMementoProject('/project', {
        '/project/custom.txt': 'custom content',
        '/project/package.json': '{"name": "overridden"}' // Should override default
      });
      
      expect(fs.existsSync('/project/custom.txt')).toBe(true);
      expect(fs.readFileSync('/project/custom.txt', 'utf8')).toBe('custom content');
      
      const pkg = JSON.parse(fs.readFileSync('/project/package.json', 'utf8') as string);
      expect(pkg.name).toBe('overridden');
    });
  });

  describe('createMultiProjectTestFileSystem', () => {
    it('should create multiple projects in one filesystem', async () => {
      const fs = await createMultiProjectTestFileSystem({
        'frontend': {
          '/frontend/package.json': '{"name": "frontend"}',
          '/frontend/src/index.ts': 'console.log("frontend");'
        },
        'backend': {
          '/backend/package.json': '{"name": "backend"}',
          '/backend/src/server.js': 'console.log("backend");'
        }
      });
      
      expect(fs.existsSync('/frontend/package.json')).toBe(true);
      expect(fs.existsSync('/backend/package.json')).toBe(true);
      
      const frontendPkg = JSON.parse(fs.readFileSync('/frontend/package.json', 'utf8') as string);
      const backendPkg = JSON.parse(fs.readFileSync('/backend/package.json', 'utf8') as string);
      
      expect(frontendPkg.name).toBe('frontend');
      expect(backendPkg.name).toBe('backend');
    });
  });

  describe('Assertion helpers', () => {
    let fs: any;

    beforeEach(async () => {
      fs = await createTestFileSystem({
        '/exists.txt': 'existing content',
        '/config.json': '{"theme": "dark", "version": "1.0.0"}',
        '/dir/subfile.txt': 'nested content'
      });
    });

    describe('assertFileExists', () => {
      it('should pass for existing files', async () => {
        await expect(assertFileExists(fs, '/exists.txt')).resolves.toBeUndefined();
      });

      it('should fail for non-existent files', async () => {
        await expect(assertFileExists(fs, '/does-not-exist.txt')).rejects.toThrow('Expected file to exist: /does-not-exist.txt');
      });

      it('should use custom error message', async () => {
        await expect(assertFileExists(fs, '/missing.txt', 'Custom error')).rejects.toThrow('Custom error');
      });
    });

    describe('assertFileNotExists', () => {
      it('should pass for non-existent files', async () => {
        await expect(assertFileNotExists(fs, '/does-not-exist.txt')).resolves.toBeUndefined();
      });

      it('should fail for existing files', async () => {
        await expect(assertFileNotExists(fs, '/exists.txt')).rejects.toThrow('Expected file not to exist: /exists.txt');
      });
    });

    describe('assertDirectoryExists', () => {
      it('should pass for existing directories', async () => {
        await expect(assertDirectoryExists(fs, '/dir')).resolves.toBeUndefined();
      });

      it('should fail for non-existent directories', async () => {
        await expect(assertDirectoryExists(fs, '/missing-dir')).rejects.toThrow('Expected directory to exist: /missing-dir');
      });

      it('should fail for files (not directories)', async () => {
        await expect(assertDirectoryExists(fs, '/exists.txt')).rejects.toThrow('Path exists but is not a directory: /exists.txt');
      });
    });

    describe('assertFileContains', () => {
      it('should pass when file contains expected content', async () => {
        await expect(assertFileContains(fs, '/exists.txt', 'existing')).resolves.toBeUndefined();
      });

      it('should fail when file does not contain expected content', async () => {
        await expect(assertFileContains(fs, '/exists.txt', 'missing')).rejects.toThrow();
      });

      it('should fail for non-existent files', async () => {
        await expect(assertFileContains(fs, '/missing.txt', 'anything')).rejects.toThrow('Cannot assert file content, file does not exist: /missing.txt');
      });
    });

    describe('assertFileEquals', () => {
      it('should pass when content matches exactly', async () => {
        await expect(assertFileEquals(fs, '/exists.txt', 'existing content')).resolves.toBeUndefined();
      });

      it('should fail when content does not match', async () => {
        await expect(assertFileEquals(fs, '/exists.txt', 'different content')).rejects.toThrow();
      });
    });

    describe('assertJsonFileContains', () => {
      it('should pass when JSON contains expected properties', async () => {
        await expect(assertJsonFileContains(fs, '/config.json', { theme: 'dark' })).resolves.toBeUndefined();
        await expect(assertJsonFileContains(fs, '/config.json', { theme: 'dark', version: '1.0.0' })).resolves.toBeUndefined();
      });

      it('should fail when JSON does not contain expected properties', async () => {
        await expect(assertJsonFileContains(fs, '/config.json', { theme: 'light' })).rejects.toThrow();
        await expect(assertJsonFileContains(fs, '/config.json', { missing: 'prop' })).rejects.toThrow();
      });

      it('should fail for non-JSON files', async () => {
        await expect(assertJsonFileContains(fs, '/exists.txt', { any: 'prop' })).rejects.toThrow('Cannot parse JSON file');
      });
    });
  });

  describe('File manipulation helpers', () => {
    let fs: any;

    beforeEach(async () => {
      fs = await createTestFileSystem();
    });

    describe('createDirectoryStructure', () => {
      it('should create multiple directories', async () => {
        const dirs = ['/dir1', '/dir2/subdir', '/dir3/deep/nested'];
        
        await createDirectoryStructure(fs, dirs);
        
        for (const dir of dirs) {
          expect(fs.existsSync(dir)).toBe(true);
        }
      });
    });

    describe('createFiles', () => {
      it('should create multiple files with content', async () => {
        const files = {
          '/file1.txt': 'content 1',
          '/dir/file2.txt': 'content 2',
          '/deep/nested/file3.txt': 'content 3'
        };
        
        await createFiles(fs, files);
        
        for (const [path, content] of Object.entries(files)) {
          expect(fs.existsSync(path)).toBe(true);
          expect(fs.readFileSync(path, 'utf8')).toBe(content);
        }
      });
    });

    describe('createJsonFile', () => {
      it('should create JSON file with formatted content', async () => {
        const data = { name: 'test', version: '1.0.0', items: [1, 2, 3] };
        
        await createJsonFile(fs, '/config.json', data);
        
        expect(fs.existsSync('/config.json')).toBe(true);
        const parsed = JSON.parse(fs.readFileSync('/config.json', 'utf8') as string);
        expect(parsed).toEqual(data);
        
        // Should be formatted with proper indentation
        const content = fs.readFileSync('/config.json', 'utf8') as string;
        expect(content).toContain('  '); // Should have indentation
      });
    });

    describe('readDirectoryStructure', () => {
      it('should read all files in directory structure recursively', async () => {
        const files = {
          '/root.txt': 'root content',
          '/dir/file1.txt': 'file 1 content',
          '/dir/subdir/file2.txt': 'file 2 content'
        };
        
        await createFiles(fs, files);
        
        const structure = await readDirectoryStructure(fs, '/');
        
        expect(structure['/root.txt']).toBe('root content');
        expect(structure['/dir/file1.txt']).toBe('file 1 content');
        expect(structure['/dir/subdir/file2.txt']).toBe('file 2 content');
      });
    });
  });

  describe('Memory filesystem specific helpers', () => {
    let fs: any;

    beforeEach(async () => {
      fs = await createTestFileSystem();
    });

    describe('populateMemoryFileSystem', () => {
      it('should populate existing filesystem with new files', () => {
        const files = {
          '/new1.txt': 'new content 1',
          '/dir/new2.txt': 'new content 2'
        };
        
        populateMemoryFileSystem(fs, files);
        
        expect(fs.existsSync('/new1.txt')).toBe(true);
        expect(fs.existsSync('/dir/new2.txt')).toBe(true);
        expect(fs.readFileSync('/new1.txt', 'utf8')).toBe('new content 1');
      });
    });

    describe('getMemoryFileSystemContents', () => {
      it('should return all files as JSON object', () => {
        fs.writeFileSync('/test.txt', 'test content');
        fs.writeFileSync('/dir/nested.txt', 'nested content');
        
        const contents = getMemoryFileSystemContents(fs);
        
        expect(contents['/test.txt']).toBe('test content');
        expect(contents['/dir/nested.txt']).toBe('nested content');
      });
    });

    describe('resetMemoryFileSystem', () => {
      it('should clear all files from filesystem', () => {
        fs.writeFileSync('/test.txt', 'content');
        expect(fs.existsSync('/test.txt')).toBe(true);
        
        resetMemoryFileSystem(fs);
        
        expect(fs.existsSync('/test.txt')).toBe(false);
        expect(Object.keys(fs.toJSON())).toHaveLength(0);
      });
    });
  });

  describe('Common test scenarios', () => {
    let fs: any;

    beforeEach(async () => {
      fs = await createTestFileSystem();
    });

    describe('setupMementoProjectStructure', () => {
      it('should create complete ZCC project structure', async () => {
        await setupMementoProjectStructure(fs, '/test-project');
        
        // Check all expected directories exist
        const expectedDirs = [
          '/test-project/.zcc',
          '/test-project/.zcc/modes',
          '/test-project/.zcc/workflows',
          '/test-project/.zcc/tickets/next',
          '/test-project/.zcc/tickets/in-progress',
          '/test-project/.zcc/tickets/done',
          '/test-project/.claude',
          '/test-project/.claude/agents',
          '/test-project/.claude/commands',
          '/test-project/src'
        ];
        
        for (const dir of expectedDirs) {
          expect(fs.existsSync(dir)).toBe(true);
        }
        
        // Check config file
        expect(fs.existsSync('/test-project/.zcc/config.json')).toBe(true);
        const config = JSON.parse(fs.readFileSync('/test-project/.zcc/config.json', 'utf8') as string);
        expect(config.version).toBe('1.0.0');
        
        // Check package.json
        expect(fs.existsSync('/test-project/package.json')).toBe(true);
        const pkg = JSON.parse(fs.readFileSync('/test-project/package.json', 'utf8') as string);
        expect(pkg.name).toBe('test-project');
      });
    });

    describe('createSampleTicket', () => {
      it('should create ticket in next status by default', async () => {
        await setupMementoProjectStructure(fs, '/project');
        
        const ticketPath = await createSampleTicket(fs, '/project', 'test-ticket');
        
        expect(ticketPath).toBe('/project/.zcc/tickets/next/test-ticket.md');
        expect(fs.existsSync(ticketPath)).toBe(true);
        
        const content = fs.readFileSync(ticketPath, 'utf8') as string;
        expect(content).toContain('# test-ticket');
        expect(content).toContain('## Description');
        expect(content).toContain('## Acceptance Criteria');
      });

      it('should create ticket in specified status', async () => {
        await setupMementoProjectStructure(fs, '/project');
        
        const ticketPath = await createSampleTicket(fs, '/project', 'in-progress-ticket', 'in-progress');
        
        expect(ticketPath).toBe('/project/.zcc/tickets/in-progress/in-progress-ticket.md');
        expect(fs.existsSync(ticketPath)).toBe(true);
      });
    });

    describe('createSampleMode', () => {
      it('should create mode with proper frontmatter and content', async () => {
        await setupMementoProjectStructure(fs, '/project');
        
        const modePath = await createSampleMode(fs, '/project', 'test-mode');
        
        expect(modePath).toBe('/project/.zcc/modes/test-mode.md');
        expect(fs.existsSync(modePath)).toBe(true);
        
        const content = fs.readFileSync(modePath, 'utf8') as string;
        expect(content).toContain('---');
        expect(content).toContain('name: test-mode');
        expect(content).toContain('description: A sample mode for testing');
        expect(content).toContain('# Test-mode Mode');
        expect(content).toContain('## Behavior');
      });
    });
  });
});