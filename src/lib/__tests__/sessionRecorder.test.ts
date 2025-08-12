import * as fs from 'fs';
import { SessionRecorder } from '../sessionRecorder';
import { TicketManager } from '../ticketManager';

// Mock the file system and TicketManager
jest.mock('fs');
jest.mock('../ticketManager');

const mockedFs = fs as jest.Mocked<typeof fs>;
const MockedTicketManager = TicketManager as jest.MockedClass<typeof TicketManager>;

describe('SessionRecorder', () => {
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

    // Mock fs.existsSync to return false by default
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.readFileSync.mockReturnValue('');
    mockedFs.readdirSync.mockReturnValue([]);
  });

  describe('recordSession', () => {
    it('should create a new ticket when no existing ticket found', async () => {
      // Mock no tickets found
      mockTicketManager.list.mockResolvedValue([]);

      const result = await sessionRecorder.recordSession();

      expect(result).toMatch(/^session-\d{4}-\d{2}-\d{2}-[a-f0-9]{6}$/);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should append to existing ticket when specified', async () => {
      const ticketName = 'existing-ticket';
      
      // Mock existing ticket
      mockTicketManager.list.mockResolvedValue([
        { name: ticketName, status: 'in-progress' }
      ]);
      
      // Mock existing ticket file
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('# Existing Ticket\n\nSome content');

      const result = await sessionRecorder.recordSession(ticketName);

      expect(result).toBe(ticketName);
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should find relevant in-progress ticket when none specified', async () => {
      const ticketName = 'auto-found-ticket';
      
      // Mock one in-progress ticket
      mockTicketManager.list.mockResolvedValue([
        { name: ticketName, status: 'in-progress' },
        { name: 'done-ticket', status: 'done' }
      ]);
      
      // Mock existing ticket file
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('# Auto Found Ticket');

      const result = await sessionRecorder.recordSession();

      expect(result).toBe(ticketName);
    });

    it('should use custom summary when provided', async () => {
      const customSummary = 'Custom session summary';
      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession(undefined, customSummary);

      // Verify that writeFileSync was called with content containing the custom summary
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      expect(writeCall[1]).toContain(customSummary);
    });
  });

  describe('session context capture', () => {
    it('should capture basic session context', async () => {
      mockTicketManager.list.mockResolvedValue([]);
      
      // Mock git directory exists
      mockedFs.existsSync.mockImplementation((path: any) => {
        return path.toString().endsWith('.git');
      });

      await sessionRecorder.recordSession();

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(content).toContain('Working Directory:');
      expect(content).toContain('Git Repository: Yes');
    });
  });

  describe('security fixes', () => {
    describe('path sanitization', () => {
      it('should remove path traversal attempts from ticket names', async () => {
        const maliciousName = '../../../etc/passwd';
        const sanitizedName = 'etcpasswd';
        
        // Mock existing ticket to test append path
        mockTicketManager.list.mockResolvedValue([
          { name: sanitizedName, status: 'in-progress' }
        ]);
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('# Existing content');

        const result = await sessionRecorder.recordSession(maliciousName);

        expect(result).toBe('etcpasswd');
        expect(result).not.toContain('..');
        expect(result).not.toContain('/');
      });

      it('should remove dangerous characters from ticket names', async () => {
        const dangerousName = 'test<>:"|?*ticket\x00\x1f';
        const sanitizedName = 'testticket';
        
        // Mock existing ticket to test append path
        mockTicketManager.list.mockResolvedValue([
          { name: sanitizedName, status: 'in-progress' }
        ]);
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('# Existing content');

        const result = await sessionRecorder.recordSession(dangerousName);

        expect(result).toBe('testticket');
        expect(result).not.toMatch(/[<>:"|?*\x00-\x1f\x7f]/);
      });

      it('should limit ticket name length', async () => {
        const longName = 'a'.repeat(200);
        const expectedName = 'a'.repeat(100); // MAX length from sanitization
        
        // Mock that a ticket exists with the truncated name
        mockTicketManager.list.mockResolvedValue([
          { name: expectedName, status: 'in-progress' }
        ]);
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('# Existing content');
        // Mock readdirSync to avoid file scanning issues
        mockedFs.readdirSync.mockReturnValue([] as any);

        const result = await sessionRecorder.recordSession(longName);

        expect(result.length).toBe(100);
        expect(result).toBe(expectedName);
      });

      it('should reject empty ticket names after sanitization', async () => {
        const invalidName = '../../../';
        mockTicketManager.list.mockResolvedValue([]);

        await expect(sessionRecorder.recordSession(invalidName)).rejects.toThrow('Invalid ticket name after sanitization');
      });
    });

    describe('file limit enforcement', () => {
      it('should stop scanning files when MAX_FILES limit is reached', async () => {
        mockTicketManager.list.mockResolvedValue([]);
        
        // Mock readdirSync to return many files
        const manyFiles = Array.from({length: 60}, (_, i) => ({
          name: `file${i}.txt`,
          isFile: () => true,
          isDirectory: () => false
        }));
        
        mockedFs.readdirSync.mockReturnValue(manyFiles as any);
        mockedFs.statSync.mockReturnValue({
          mtime: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        } as any);

        await sessionRecorder.recordSession();

        // Verify statSync was called but not excessively (should be limited per scan)
        const totalCalls = mockedFs.statSync.mock.calls.length;
        expect(totalCalls).toBeGreaterThan(50); // At least one full scan
        expect(totalCalls).toBeLessThan(150); // But not unlimited calls
      });
    });

    describe('race condition handling', () => {
      it('should continue scanning when fs.statSync throws errors', async () => {
        mockTicketManager.list.mockResolvedValue([]);
        
        // Mock some files that exist and some that cause errors
        const mixedFiles = [
          { name: 'good1.txt', isFile: () => true, isDirectory: () => false },
          { name: 'error.txt', isFile: () => true, isDirectory: () => false },
          { name: 'good2.txt', isFile: () => true, isDirectory: () => false }
        ];
        
        mockedFs.readdirSync.mockReturnValue(mixedFiles as any);
        mockedFs.statSync.mockImplementation((filePath: any) => {
          if (filePath.toString().includes('error.txt')) {
            throw new Error('File disappeared');
          }
          return {
            mtime: new Date(Date.now() - 30 * 60 * 1000)
          } as any;
        });

        await sessionRecorder.recordSession();

        // Should have called statSync for all files, including the one that errors (called twice)
        expect(mockedFs.statSync).toHaveBeenCalledTimes(6); // 3 files * 2 calls
        
        // Should still complete successfully despite errors
        expect(mockedFs.writeFileSync).toHaveBeenCalled();
      });
    });

    describe('depth limit enforcement', () => {
      it('should not scan deeper than MAX_DEPTH', async () => {
        mockTicketManager.list.mockResolvedValue([]);
        
        // Create a deep directory structure mock
        let readdirCallCount = 0;
        mockedFs.readdirSync.mockImplementation((_dirPath: any) => {
          readdirCallCount++;
          
          // Return nested directory structure only for first few calls
          if (readdirCallCount <= 6) { // Called twice for each directory due to dual scanning
            return [{
              name: `subdir${readdirCallCount}`,
              isFile: () => false,
              isDirectory: () => true
            }] as any;
          }
          return [] as any;
        });

        await sessionRecorder.recordSession();

        // Should not scan beyond MAX_DEPTH (2) + root (1) = 3 levels per scan * 2 scans = 6 calls max
        expect(readdirCallCount).toBeLessThanOrEqual(6);
      });
    });
  });
});