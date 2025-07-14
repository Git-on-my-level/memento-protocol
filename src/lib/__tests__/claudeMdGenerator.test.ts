import * as fs from 'fs/promises';
import * as path from 'path';
import { ClaudeMdGenerator } from '../claudeMdGenerator';

jest.mock('fs/promises');
jest.mock('../logger', () => ({
  logger: {
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ClaudeMdGenerator', () => {
  const mockProjectRoot = '/test/project';
  const mockClaudeMdPath = path.join(mockProjectRoot, 'CLAUDE.md');
  let generator: ClaudeMdGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new ClaudeMdGenerator(mockProjectRoot);
  });

  describe('generate', () => {
    it('should generate minimal router content when no existing content', async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);

      await generator.generate();

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining('# CLAUDE.md - Memento Protocol Router'),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining('act as [mode]'),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining('execute [workflow]'),
        'utf-8'
      );
    });

    it('should merge with existing content', async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      const existingContent = '## My Project\n\nSome existing instructions.';

      await generator.generate(existingContent);

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining('## My Project'),
        'utf-8'
      );
    });

    it('should preserve project-specific content after marker', async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      const existingContent = `# CLAUDE.md - Memento Protocol Router
Some old router content
<!-- Project-specific content below this line -->
## My Custom Section
Custom project instructions`;

      await generator.generate(existingContent);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('## My Custom Section');
      expect(writtenContent).toContain('Custom project instructions');
    });
  });

  describe('exists', () => {
    it('should return true when CLAUDE.md exists', async () => {
      jest.mocked(fs.access).mockResolvedValueOnce(undefined);

      const exists = await generator.exists();

      expect(exists).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(mockClaudeMdPath);
    });

    it('should return false when CLAUDE.md does not exist', async () => {
      jest.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const exists = await generator.exists();

      expect(exists).toBe(false);
    });
  });

  describe('readExisting', () => {
    it('should return content when file exists', async () => {
      const mockContent = '# Existing CLAUDE.md';
      jest.mocked(fs.readFile).mockResolvedValueOnce(mockContent);

      const content = await generator.readExisting();

      expect(content).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(mockClaudeMdPath, 'utf-8');
    });

    it('should return null when file does not exist', async () => {
      jest.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const content = await generator.readExisting();

      expect(content).toBeNull();
    });
  });
});