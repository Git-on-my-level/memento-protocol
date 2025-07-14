import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface TicketMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'closed';
  description?: string;
}

export class TicketManager {
  private mementoDir: string;
  private ticketsDir: string;

  constructor(projectRoot: string) {
    this.mementoDir = path.join(projectRoot, '.memento');
    this.ticketsDir = path.join(this.mementoDir, 'tickets');
  }

  /**
   * Generate a semantic ticket ID with timestamp
   */
  private generateTicketId(name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}-${timestamp}`;
  }

  /**
   * Create a new ticket
   */
  async create(name: string, description?: string): Promise<string> {
    const ticketId = this.generateTicketId(name);
    const ticketPath = path.join(this.ticketsDir, ticketId);

    // Check if ticket already exists
    if (fs.existsSync(ticketPath)) {
      throw new Error(`Ticket ${ticketId} already exists`);
    }

    // Create ticket directory structure
    fs.mkdirSync(ticketPath, { recursive: true });
    fs.mkdirSync(path.join(ticketPath, 'workspace'), { recursive: true });

    // Create metadata
    const metadata: TicketMetadata = {
      id: ticketId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      description
    };

    // Write metadata file
    fs.writeFileSync(
      path.join(ticketPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create initial progress file
    const progressContent = `# Ticket: ${name}

## Description
${description || 'No description provided.'}

## Progress Log
- ${new Date().toISOString()}: Ticket created

## Next Steps
- [ ] Define objectives
- [ ] Begin implementation

`;
    fs.writeFileSync(path.join(ticketPath, 'progress.md'), progressContent);

    // Create decisions file
    const decisionsContent = `# Design Decisions for ${name}

## Overview
Document key design decisions made during this ticket.

## Decisions

### ${new Date().toISOString()}
- **Decision**: Ticket created
- **Rationale**: Starting work on ${name}
- **Alternatives Considered**: N/A

`;
    fs.writeFileSync(path.join(ticketPath, 'decisions.md'), decisionsContent);

    logger.success(`Created ticket: ${ticketId}`);
    return ticketId;
  }

  /**
   * List all tickets with optional filtering
   */
  async list(status: 'active' | 'closed' | 'all' = 'active'): Promise<TicketMetadata[]> {
    if (!fs.existsSync(this.ticketsDir)) {
      return [];
    }

    const tickets: TicketMetadata[] = [];
    const ticketDirs = fs.readdirSync(this.ticketsDir);

    for (const ticketDir of ticketDirs) {
      const metadataPath = path.join(this.ticketsDir, ticketDir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata: TicketMetadata = JSON.parse(
            fs.readFileSync(metadataPath, 'utf-8')
          );
          
          if (status === 'all' || metadata.status === status) {
            tickets.push(metadata);
          }
        } catch (error) {
          logger.warn(`Failed to read metadata for ticket ${ticketDir}`);
        }
      }
    }

    // Sort by updatedAt, newest first
    return tickets.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get ticket details
   */
  async get(ticketId: string): Promise<TicketMetadata | null> {
    const metadataPath = path.join(this.ticketsDir, ticketId, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    } catch (error) {
      logger.error(`Failed to read ticket metadata: ${error}`);
      return null;
    }
  }

  /**
   * Update ticket metadata
   */
  async update(ticketId: string, updates: Partial<TicketMetadata>): Promise<void> {
    const metadata = await this.get(ticketId);
    
    if (!metadata) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const updatedMetadata = {
      ...metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.ticketsDir, ticketId, 'metadata.json'),
      JSON.stringify(updatedMetadata, null, 2)
    );

    logger.success(`Updated ticket: ${ticketId}`);
  }

  /**
   * Close a ticket
   */
  async close(ticketId: string): Promise<void> {
    await this.update(ticketId, { status: 'closed' });
    
    // Append closure to progress file
    const progressPath = path.join(this.ticketsDir, ticketId, 'progress.md');
    if (fs.existsSync(progressPath)) {
      const content = fs.readFileSync(progressPath, 'utf-8');
      const closureNote = `\n## Closure\n- ${new Date().toISOString()}: Ticket closed\n`;
      fs.writeFileSync(progressPath, content + closureNote);
    }
  }

  /**
   * Resume a ticket (mark as active)
   */
  async resume(ticketId: string): Promise<void> {
    await this.update(ticketId, { status: 'active' });
    
    // Append resumption to progress file
    const progressPath = path.join(this.ticketsDir, ticketId, 'progress.md');
    if (fs.existsSync(progressPath)) {
      const content = fs.readFileSync(progressPath, 'utf-8');
      const resumeNote = `\n- ${new Date().toISOString()}: Ticket resumed\n`;
      fs.writeFileSync(progressPath, content + resumeNote);
    }
  }

  /**
   * Get the workspace directory for a ticket
   */
  getWorkspacePath(ticketId: string): string {
    return path.join(this.ticketsDir, ticketId, 'workspace');
  }

  /**
   * Search tickets by name or description
   */
  async search(query: string): Promise<TicketMetadata[]> {
    const allTickets = await this.list('all');
    const lowerQuery = query.toLowerCase();
    
    return allTickets.filter(ticket => 
      ticket.name.toLowerCase().includes(lowerQuery) ||
      (ticket.description && ticket.description.toLowerCase().includes(lowerQuery))
    );
  }
}