import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

export type TicketStatus = 'next' | 'in-progress' | 'done';

export interface TicketInfo {
  name: string;
  status: TicketStatus;
}

export class TicketManager {
  private zccDir: string;
  private ticketsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.zccDir = this.fs.join(projectRoot, '.zcc');
    this.ticketsDir = this.fs.join(this.zccDir, 'tickets');
    this.ensureStatusDirectories();
  }

  /**
   * Sanitize ticket name to prevent path traversal and other security issues
   */
  private sanitizeTicketName(name: string): string {
    // Validate input
    if (!name || typeof name !== 'string') {
      throw new Error('Ticket name must be a non-empty string');
    }

    // Remove leading/trailing whitespace
    name = name.trim();

    // Check for empty name after trimming
    if (!name) {
      throw new Error('Ticket name cannot be empty or only whitespace');
    }

    // Remove path traversal attempts (../, ..\, etc.)
    name = name.replace(/\.\.[\/\\]/g, '');
    name = name.replace(/\.\./g, '');

    // Remove absolute path indicators
    name = name.replace(/^[\/\\]+/, '');
    
    // Replace directory separators with hyphens
    name = name.replace(/[\/\\]/g, '-');

    // Remove dangerous characters and control characters
    name = name.replace(/[<>:"|?*\x00-\x1f\x80-\x9f]/g, '');

    // Handle Windows reserved names
    const windowsReserved = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
    if (windowsReserved.test(name)) {
      name = `ticket-${name}`;
    }

    // Limit length for filesystem compatibility
    const maxLength = 100;
    if (name.length > maxLength) {
      name = name.substring(0, maxLength);
    }

    // Final validation
    if (!name) {
      throw new Error('Ticket name contains only invalid characters');
    }

    return name;
  }

  /**
   * Validate that a path is within the tickets directory
   */
  private validatePath(filepath: string): void {
    const normalizedPath = this.fs.resolve(filepath);
    const normalizedTicketsDir = this.fs.resolve(this.ticketsDir);
    
    if (!normalizedPath.startsWith(normalizedTicketsDir)) {
      throw new Error('Invalid ticket path: attempted to access outside tickets directory');
    }
  }

  /**
   * Ensure status directories exist
   */
  private ensureStatusDirectories(): void {
    const statusDirs = ['next', 'in-progress', 'done'];
    statusDirs.forEach(status => {
      const statusDir = this.fs.join(this.ticketsDir, status);
      if (!this.fs.existsSync(statusDir)) {
        this.fs.mkdirSync(statusDir, { recursive: true });
      }
    });
  }

  /**
   * Find a ticket by name across all status directories
   */
  private findTicket(name: string): { path: string; status: TicketStatus } | null {
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      // Check with .md extension
      const pathWithMd = this.fs.join(this.ticketsDir, status, `${name}.md`);
      if (this.fs.existsSync(pathWithMd)) {
        return { path: pathWithMd, status };
      }
      
      // Check without extension (for backwards compatibility)
      const pathWithoutMd = this.fs.join(this.ticketsDir, status, name);
      if (this.fs.existsSync(pathWithoutMd) && this.fs.statSync(pathWithoutMd).isFile()) {
        return { path: pathWithoutMd, status };
      }
    }
    
    return null;
  }

  /**
   * Create a new ticket
   */
  async create(name: string): Promise<string> {
    // Sanitize the ticket name
    const sanitizedName = this.sanitizeTicketName(name);
    
    // Check if ticket already exists
    if (this.findTicket(sanitizedName)) {
      throw new Error(`Ticket '${sanitizedName}' already exists`);
    }

    const ticketPath = this.fs.join(this.ticketsDir, 'next', `${sanitizedName}.md`);
    
    // Validate the final path
    this.validatePath(ticketPath);
    
    // Create initial content (use original name for display)
    const content = `# ${name !== sanitizedName ? name : sanitizedName}

## Description
[Add ticket description here]

## Tasks
- [ ] Task 1
- [ ] Task 2

## Notes
[Add any relevant notes here]

---
Created: ${new Date().toISOString()}
`;

    this.fs.writeFileSync(ticketPath, content);
    return ticketPath;
  }

  /**
   * List all tickets
   */
  async list(): Promise<TicketInfo[]> {
    const tickets: TicketInfo[] = [];
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      const statusDir = this.fs.join(this.ticketsDir, status);
      if (this.fs.existsSync(statusDir)) {
        const files = this.fs.readdirSync(statusDir);
        files.forEach(file => {
          // Only include .md files or files without extension that are regular files
          if (file.endsWith('.md') || (!file.includes('.') && this.fs.statSync(this.fs.join(statusDir, file)).isFile())) {
            const name = file.endsWith('.md') ? file.slice(0, -3) : file;
            tickets.push({ name, status });
          }
        });
      }
    }
    
    return tickets;
  }

  /**
   * Move a ticket to a different status
   */
  async move(name: string, toStatus: TicketStatus): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    if (ticket.status === toStatus) {
      throw new Error(`Ticket '${name}' is already in ${toStatus}`);
    }

    const filename = this.fs.basename(ticket.path);
    const newPath = this.fs.join(this.ticketsDir, toStatus, filename);
    
    // Use read+write+unlink pattern since FileSystemAdapter doesn't have rename
    const content = await this.fs.readFile(ticket.path, 'utf8') as string;
    await this.fs.writeFile(newPath, content);
    await this.fs.unlink(ticket.path);
  }

  /**
   * Delete a ticket
   */
  async delete(name: string): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    await this.fs.unlink(ticket.path);
  }
}