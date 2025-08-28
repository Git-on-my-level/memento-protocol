import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';
import { TicketError } from './errors';
import { InputValidator } from './validation/InputValidator';

export type TicketStatus = 'next' | 'in-progress' | 'done';

export interface TicketInfo {
  name: string;
  status: TicketStatus;
}

export class TicketManager {
  private projectRoot: string;
  private mementoDir: string;
  private ticketsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.mementoDir = this.fs.join(projectRoot, '.memento');
    this.ticketsDir = this.fs.join(this.mementoDir, 'tickets');
    this.ensureStatusDirectories();
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
    // Validate and sanitize ticket name for security
    const validatedName = InputValidator.validateTicketName(name);
    
    // Check if ticket already exists
    if (this.findTicket(validatedName)) {
      throw new TicketError('create', validatedName, 'ticket already exists');
    }

    // Validate filename for ticket
    const fileName = `${validatedName}.md`;
    const validatedFileName = InputValidator.validateFileName(fileName, 'ticket filename');
    
    const ticketPath = this.fs.join(this.ticketsDir, 'next', validatedFileName);
    
    // Validate ticket path for security
    try {
      InputValidator.validateFilePath(ticketPath, this.projectRoot, 'ticket file path');
    } catch (pathError) {
      throw new TicketError(
        'create', 
        validatedName, 
        `path validation failed: ${pathError instanceof Error ? pathError.message : 'Invalid path'}`,
        'Ticket path is not safe for creation'
      );
    }
    
    // Create initial content
    const content = `# ${validatedName}

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

    // Validate template content before writing
    InputValidator.validateTemplateContent(content, `ticket ${validatedName}`);

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
    // Validate and sanitize ticket name for security
    const validatedName = InputValidator.validateTicketName(name);
    
    const ticket = this.findTicket(validatedName);
    if (!ticket) {
      throw new TicketError('move', validatedName, 'ticket not found');
    }

    if (ticket.status === toStatus) {
      throw new TicketError('move', validatedName, `already in '${toStatus}' status`, 'No action needed - ticket is already in the target status');
    }

    const filename = this.fs.basename(ticket.path);
    // Validate filename for security
    const validatedFileName = InputValidator.validateFileName(filename, 'ticket filename');
    const newPath = this.fs.join(this.ticketsDir, toStatus, validatedFileName);
    
    // Validate destination path
    try {
      InputValidator.validateFilePath(newPath, process.cwd(), 'ticket destination path');
    } catch (pathError) {
      throw new TicketError(
        'move', 
        validatedName, 
        `destination path validation failed: ${pathError instanceof Error ? pathError.message : 'Invalid path'}`,
        'Ticket move destination is not safe'
      );
    }
    
    // Use read+write+unlink pattern since FileSystemAdapter doesn't have rename
    const content = await this.fs.readFile(ticket.path, 'utf8') as string;
    
    // Validate content before writing (in case it was tampered with)
    InputValidator.validateTemplateContent(content, `ticket ${validatedName} content`);
    
    await this.fs.writeFile(newPath, content);
    await this.fs.unlink(ticket.path);
  }

  /**
   * Delete a ticket
   */
  async delete(name: string): Promise<void> {
    // Validate and sanitize ticket name for security
    const validatedName = InputValidator.validateTicketName(name);
    
    const ticket = this.findTicket(validatedName);
    if (!ticket) {
      throw new TicketError('delete', validatedName, 'ticket not found');
    }

    // Validate the ticket path before deletion to prevent directory traversal
    try {
      InputValidator.validateFilePath(ticket.path, process.cwd(), 'ticket deletion path');
    } catch (pathError) {
      throw new TicketError(
        'delete', 
        validatedName, 
        `path validation failed: ${pathError instanceof Error ? pathError.message : 'Invalid path'}`,
        'Ticket deletion path is not safe'
      );
    }

    try {
      await this.fs.unlink(ticket.path);
    } catch (error: any) {
      throw new TicketError('delete', validatedName, `failed to delete ticket file: ${error.message}`, 'Check file permissions and try again');
    }
  }
}