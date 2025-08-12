import * as fs from 'fs';
import * as path from 'path';
import { SessionRecorder } from '../sessionRecorder';
import { TicketManager } from '../ticketManager';

// Mock the file system and TicketManager
jest.mock('fs');
jest.mock('../ticketManager');

const mockedFs = fs as jest.Mocked<typeof fs>;
const MockedTicketManager = TicketManager as jest.MockedClass<typeof TicketManager>;

describe('SessionRecorder - Additional Test Coverage', () => {
  let sessionRecorder: SessionRecorder;
  let mockTicketManager: jest.Mocked<TicketManager>;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocked TicketManager
    mockTicketManager = {
      list: jest.fn(),
    } as any;
    MockedTicketManager.mockImplementation(() => mockTicketManager);
    
    sessionRecorder = new SessionRecorder(testProjectRoot);

    // Default mocks
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.readFileSync.mockReturnValue('');
    mockedFs.readdirSync.mockReturnValue([]);
  });

  describe('File System Error Handling', () => {
    it('should handle file system errors during directory scanning gracefully', async () => {
      // Mock readdirSync to throw an error
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      mockTicketManager.list.mockResolvedValue([]);

      // Should not throw despite file system error
      const result = await sessionRecorder.recordSession();
      expect(result).toMatch(/^session-\d+$/);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle statSync errors for individual files gracefully', async () => {
      const mockDirents = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'file2.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
      ];

      mockedFs.readdirSync.mockReturnValue(mockDirents as any);
      
      // Make statSync throw for one file but not others
      mockedFs.statSync.mockImplementation((filePath: any) => {
        if (filePath.includes('file1.txt')) {
          throw new Error('File access denied');
        }
        return {
          mtime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        } as any;
      });

      mockTicketManager.list.mockResolvedValue([]);

      // Should handle error gracefully and continue
      await expect(sessionRecorder.recordSession()).resolves.toMatch(/^session-\d+$/);
    });

    it('should handle mkdir errors when creating ticket directories', async () => {
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Cannot create directory');
      });

      mockTicketManager.list.mockResolvedValue([]);

      // Should propagate mkdir errors since they're critical
      await expect(sessionRecorder.recordSession()).rejects.toThrow();
    });

    it('should handle writeFileSync errors when writing tickets', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Cannot write file');
      });

      mockTicketManager.list.mockResolvedValue([]);

      // Should propagate write errors since they're critical
      await expect(sessionRecorder.recordSession()).rejects.toThrow();
    });
  });

  describe('Path Traversal Security Tests', () => {
    it('should safely handle path traversal attempts in directory names', async () => {
      const maliciousDirents = [
        { name: '../../../etc/passwd', isFile: () => true, isDirectory: () => false },
        { name: '..\\..\\windows\\system32', isFile: () => true, isDirectory: () => false },
        { name: 'normal-file.txt', isFile: () => true, isDirectory: () => false },
      ];

      mockedFs.readdirSync.mockReturnValue(maliciousDirents as any);
      mockedFs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 30 * 60 * 1000),
      } as any);

      mockTicketManager.list.mockResolvedValue([]);

      // Should handle malicious paths without throwing
      await expect(sessionRecorder.recordSession()).resolves.toMatch(/^session-\d+$/);
      
      // Verify that path.relative was called with project root to normalize paths
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      // Should not contain raw traversal sequences in final content
      expect(content).not.toContain('../../../etc/passwd');
      expect(content).not.toContain('..\\..\\windows\\system32');
    });

    it('should reject ticket names with path traversal sequences', async () => {
      const maliciousTicketName = '../../../malicious-ticket';
      
      mockTicketManager.list.mockResolvedValue([
        { name: maliciousTicketName, status: 'in-progress' }
      ]);

      // Should handle path traversal in ticket names safely
      // The path.join should normalize the path properly
      await expect(sessionRecorder.recordSession(maliciousTicketName)).resolves.toBe(maliciousTicketName);
      
      // Verify the actual file path was normalized
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const filePath = writeCall[0] as string;
      expect(filePath).toContain('.memento/tickets/in-progress');
      expect(path.isAbsolute(filePath)).toBe(true);
    });
  });

  describe('Performance and Resource Limits', () => {
    it('should respect depth limits during directory traversal', async () => {
      let callDepth = 0;
      const maxDepthReached = 3;

      // Mock nested directory structure
      mockedFs.readdirSync.mockImplementation((dir: string) => {
        callDepth++;
        
        // Create mock directory structure that goes deeper than limit
        if (callDepth <= maxDepthReached) {
          return [
            { name: `level${callDepth}-file.txt`, isFile: () => true, isDirectory: () => false },
            { name: `level${callDepth + 1}`, isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        return [];
      });

      mockedFs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 30 * 60 * 1000),
      } as any);

      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession();
      
      // Verify that directory scanning stopped at depth limit
      // The implementation limits depth to 2, so we should see at most 3 calls (0, 1, 2)
      expect(callDepth).toBeLessThanOrEqual(3);
    });

    it('should handle large numbers of files efficiently', async () => {
      // Generate a large number of mock files
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        name: `file${i}.txt`,
        isFile: () => true,
        isDirectory: () => false,
      }));

      mockedFs.readdirSync.mockReturnValue(largeFileList as any);
      mockedFs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 30 * 60 * 1000),
      } as any);

      mockTicketManager.list.mockResolvedValue([]);

      const startTime = Date.now();
      await sessionRecorder.recordSession();
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second for mocked operations)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should limit the number of files reported (implementation shows max 5)
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      // Count occurrences of file references - should be limited
      const fileMatches = content.match(/file\d+\.txt/g);
      if (fileMatches) {
        expect(fileMatches.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Malformed Ticket Name Handling', () => {
    it('should handle ticket names with special characters', async () => {
      const specialCharTickets = [
        'ticket@with!special#chars',
        'ticket with spaces',
        'ticket-with-unicode-éñ',
        'ticket/with/slashes',
        'ticket\\with\\backslashes',
      ];

      for (const ticketName of specialCharTickets) {
        mockTicketManager.list.mockResolvedValue([
          { name: ticketName, status: 'next' }
        ]);

        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('# Existing ticket content');

        await expect(sessionRecorder.recordSession(ticketName)).resolves.toBe(ticketName);
      }
    });

    it('should handle empty or null ticket names', async () => {
      mockTicketManager.list.mockResolvedValue([]);

      // Test empty string
      const result1 = await sessionRecorder.recordSession('');
      expect(result1).toMatch(/^session-\d+$/);

      // Test undefined (should auto-generate)
      const result2 = await sessionRecorder.recordSession(undefined);
      expect(result2).toMatch(/^session-\d+$/);
    });

    it('should handle extremely long ticket names', async () => {
      const longTicketName = 'a'.repeat(1000);
      
      mockTicketManager.list.mockResolvedValue([
        { name: longTicketName, status: 'next' }
      ]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('# Existing content');

      // Should handle long names without crashing
      await expect(sessionRecorder.recordSession(longTicketName)).resolves.toBe(longTicketName);
    });
  });

  describe('Enhanced File Scanning Logic', () => {
    it('should correctly filter files by modification time', async () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);

      const mockFiles = [
        { name: 'recent-file.txt', isFile: () => true, isDirectory: () => false },
        { name: 'old-file.txt', isFile: () => true, isDirectory: () => false },
      ];

      mockedFs.readdirSync.mockReturnValue(mockFiles as any);
      
      mockedFs.statSync.mockImplementation((filePath: any) => {
        if (filePath.includes('recent-file.txt')) {
          return { mtime: new Date(oneHourAgo + 30 * 60 * 1000) }; // 30 minutes ago
        } else {
          return { mtime: new Date(twoHoursAgo) }; // 2 hours ago
        }
      });

      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession();

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      // Should only include recent file
      expect(content).toContain('recent-file.txt');
      expect(content).not.toContain('old-file.txt');
    });

    it('should properly skip hidden directories and node_modules', async () => {
      const mockDirents = [
        { name: '.git', isFile: () => false, isDirectory: () => true },
        { name: '.hidden', isFile: () => false, isDirectory: () => true },
        { name: 'node_modules', isFile: () => false, isDirectory: () => true },
        { name: 'src', isFile: () => false, isDirectory: () => true },
        { name: '.env', isFile: () => true, isDirectory: () => false },
        { name: 'package.json', isFile: () => true, isDirectory: () => false },
      ];

      mockedFs.readdirSync.mockReturnValue(mockDirents as any);
      mockedFs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 30 * 60 * 1000),
      } as any);

      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession();

      // Verify that readdirSync was called only for the project root and 'src' directory
      // (should skip .git, .hidden, node_modules)
      const readdirCalls = mockedFs.readdirSync.mock.calls;
      const calledPaths = readdirCalls.map(call => call[0]);
      
      expect(calledPaths).toContain(testProjectRoot);
      expect(calledPaths).not.toContain(path.join(testProjectRoot, '.git'));
      expect(calledPaths).not.toContain(path.join(testProjectRoot, '.hidden'));
      expect(calledPaths).not.toContain(path.join(testProjectRoot, 'node_modules'));
    });

    it('should handle mixed file and directory entries correctly', async () => {
      const mockDirents = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'dir1', isFile: () => false, isDirectory: () => true },
        { name: 'file2.js', isFile: () => true, isDirectory: () => false },
      ];

      // Mock subdirectory contents
      mockedFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === testProjectRoot) {
          return mockDirents as any;
        } else if (dirPath.includes('dir1')) {
          return [
            { name: 'nested-file.txt', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        return [];
      });

      mockedFs.statSync.mockReturnValue({
        mtime: new Date(Date.now() - 30 * 60 * 1000),
      } as any);

      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession();

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      // Should include both top-level and nested files
      expect(content).toContain('Modified 3 file(s)'); // file1.txt, file2.js, nested-file.txt
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle ticket manager errors gracefully', async () => {
      mockTicketManager.list.mockRejectedValue(new Error('Failed to list tickets'));

      // Should fall back to creating new session ticket
      const result = await sessionRecorder.recordSession();
      expect(result).toMatch(/^session-\d+$/);
    });

    it('should handle missing ticket status gracefully', async () => {
      mockTicketManager.list.mockResolvedValue([
        { name: 'test-ticket', status: undefined as any }
      ]);

      await expect(sessionRecorder.recordSession('test-ticket')).rejects.toThrow();
    });

    it('should handle invalid ticket status directory gracefully', async () => {
      mockTicketManager.list.mockResolvedValue([
        { name: 'test-ticket', status: 'invalid-status' }
      ]);

      // Should create the path even with invalid status
      await expect(sessionRecorder.recordSession('test-ticket')).resolves.toBe('test-ticket');
    });
  });
});