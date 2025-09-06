import { TicketManager } from '../ticketManager';
import { createTestFileSystem } from '../testing/createTestFileSystem';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';

describe('TicketManager Security', () => {
  let fs: FileSystemAdapter;
  let ticketManager: TicketManager;
  const projectRoot = '/test-project';

  beforeEach(async () => {
    fs = await createTestFileSystem({
      [`${projectRoot}/.zcc/tickets/next/.gitkeep`]: '',
      [`${projectRoot}/.zcc/tickets/in-progress/.gitkeep`]: '',
      [`${projectRoot}/.zcc/tickets/done/.gitkeep`]: '',
    });
    ticketManager = new TicketManager(projectRoot, fs);
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal with ../', async () => {
      await expect(ticketManager.create('../../../etc/passwd')).resolves.toBeTruthy();
      // Should create a sanitized file, not traverse
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('etc-passwd.md');
      expect(files).not.toContain('...');
    });

    it('should prevent path traversal with ..\\', async () => {
      await expect(ticketManager.create('..\\..\\..\\windows\\system32')).resolves.toBeTruthy();
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('windows-system32.md');
    });

    it('should prevent absolute paths', async () => {
      await expect(ticketManager.create('/etc/shadow')).resolves.toBeTruthy();
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('etc-shadow.md');
    });

    it('should handle mixed traversal attempts', async () => {
      await expect(ticketManager.create('../.../../etc/../passwd')).resolves.toBeTruthy();
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      // After sanitization, should just be 'passwd.md' since all ../etc/ gets removed
      expect(files.some(f => f.includes('passwd'))).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should reject empty ticket names', async () => {
      await expect(ticketManager.create('')).rejects.toThrow('Ticket name must be a non-empty string');
    });

    it('should reject whitespace-only names', async () => {
      await expect(ticketManager.create('   ')).rejects.toThrow('Ticket name cannot be empty');
    });

    it('should reject null/undefined names', async () => {
      await expect(ticketManager.create(null as any)).rejects.toThrow('Ticket name must be a non-empty string');
      await expect(ticketManager.create(undefined as any)).rejects.toThrow('Ticket name must be a non-empty string');
    });

    it('should handle names with only invalid characters', async () => {
      await expect(ticketManager.create('<>:|')).rejects.toThrow('Ticket name contains only invalid characters');
    });
  });

  describe('Special Character Handling', () => {
    it('should remove dangerous characters', async () => {
      await ticketManager.create('test<>:"|?*ticket');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('testticket.md');
    });

    it('should replace directory separators with hyphens', async () => {
      await ticketManager.create('feature/authentication/login');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('feature-authentication-login.md');
    });

    it('should handle backslashes', async () => {
      await ticketManager.create('feature\\backend\\api');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('feature-backend-api.md');
    });
  });

  describe('Windows Reserved Names', () => {
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];

    reservedNames.forEach(name => {
      it(`should handle Windows reserved name: ${name}`, async () => {
        await ticketManager.create(name);
        const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
        expect(files).toContain(`ticket-${name}.md`);
      });

      it(`should handle lowercase variant: ${name.toLowerCase()}`, async () => {
        await ticketManager.create(name.toLowerCase());
        const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
        expect(files).toContain(`ticket-${name.toLowerCase()}.md`);
      });
    });
  });

  describe('Length Limits', () => {
    it('should truncate very long names', async () => {
      const longName = 'a'.repeat(150);
      await ticketManager.create(longName);
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      const createdFile = files.find(f => f.startsWith('a'));
      expect(createdFile).toBeDefined();
      // Should be truncated to 100 chars + .md extension
      expect(createdFile!.length).toBe(103); // 100 chars + '.md' extension (100 + 3)
    });

    it('should preserve meaningful content when truncating', async () => {
      const longName = 'important-feature-' + 'x'.repeat(100);
      await ticketManager.create(longName);
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      const createdFile = files.find(f => f.startsWith('important-feature-'));
      expect(createdFile).toBeDefined();
    });
  });

  describe('Complex Attack Scenarios', () => {
    it('should handle URL-encoded traversal', async () => {
      await ticketManager.create('%2e%2e%2f%2e%2e%2fetc%2fpasswd');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      // URL encoding should be treated as literal characters
      expect(files.some(f => f.includes('etc') || f.includes('passwd'))).toBeTruthy();
    });

    it('should handle Unicode traversal attempts', async () => {
      await ticketManager.create('．．／．．／etc／passwd');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files.length).toBeGreaterThan(0);
      // Should not traverse
      expect(await fs.exists('/etc/passwd.md')).toBe(false);
    });

    it('should handle null bytes', async () => {
      await ticketManager.create('ticket\x00.txt');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('ticket.txt.md');
    });
  });

  describe('Edge Cases', () => {
    it('should handle emoji in ticket names', async () => {
      await ticketManager.create('🎉 celebration-ticket 🎉');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('🎉 celebration-ticket 🎉.md');
    });

    it('should handle international characters', async () => {
      await ticketManager.create('über-ticket-日本語');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('über-ticket-日本語.md');
    });

    it('should handle spaces in names', async () => {
      await ticketManager.create('my important ticket');
      const files = await fs.readdir(`${projectRoot}/.zcc/tickets/next`);
      expect(files).toContain('my important ticket.md');
    });
  });

  describe('Path Validation', () => {
    it('should ensure all ticket operations stay within tickets directory', async () => {
      // Create a ticket with sanitized name
      const ticketPath = await ticketManager.create('normal-ticket');
      expect(ticketPath).toContain('.zcc/tickets/');
      
      // Move operation should also validate
      await ticketManager.move('normal-ticket', 'in-progress');
      const inProgressFiles = await fs.readdir(`${projectRoot}/.zcc/tickets/in-progress`);
      expect(inProgressFiles).toContain('normal-ticket.md');
    });
  });
});