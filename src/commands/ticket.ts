import { Command } from 'commander';
import { TicketManager } from '../lib/ticketManager';
import { logger } from '../lib/logger';

const ticketCommand = new Command('ticket')
  .description('Manage tickets for persistent workspace');

// Create subcommand
ticketCommand
  .command('create <name>')
  .description('Create a new ticket')
  .option('-d, --description <desc>', 'Ticket description')
  .action(async (name: string, options: { description?: string }) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const ticketId = await ticketManager.create(name, options.description);
      logger.info(`Ticket created successfully!`);
      logger.info(`ID: ${ticketId}`);
      logger.info(`Workspace: .memento/tickets/${ticketId}/workspace/`);
    } catch (error) {
      logger.error(`Failed to create ticket: ${error}`);
      process.exit(1);
    }
  });

// List subcommand
ticketCommand
  .command('list')
  .description('List tickets')
  .option('-s, --status <status>', 'Filter by status (active, closed, all)', 'active')
  .action(async (options: { status: 'active' | 'closed' | 'all' }) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const tickets = await ticketManager.list(options.status);
      
      if (tickets.length === 0) {
        logger.info(`No ${options.status === 'all' ? '' : options.status} tickets found.`);
        return;
      }

      logger.info(`\n${options.status === 'all' ? 'All' : options.status.charAt(0).toUpperCase() + options.status.slice(1)} tickets:\n`);
      
      tickets.forEach(ticket => {
        const status = ticket.status === 'active' ? '🟢' : '⚪';
        logger.info(`${status} ${ticket.id}`);
        logger.info(`   Name: ${ticket.name}`);
        if (ticket.description) {
          logger.info(`   Description: ${ticket.description}`);
        }
        logger.info(`   Created: ${new Date(ticket.createdAt).toLocaleString()}`);
        logger.info(`   Updated: ${new Date(ticket.updatedAt).toLocaleString()}`);
        logger.info('');
      });
    } catch (error) {
      logger.error(`Failed to list tickets: ${error}`);
      process.exit(1);
    }
  });

// Resume subcommand
ticketCommand
  .command('resume <id>')
  .description('Resume work on a ticket')
  .action(async (ticketId: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const ticket = await ticketManager.get(ticketId);
      
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        process.exit(1);
      }

      if (ticket.status === 'active') {
        logger.info(`Ticket ${ticketId} is already active`);
      } else {
        await ticketManager.resume(ticketId);
        logger.success(`Resumed ticket: ${ticketId}`);
      }

      logger.info(`\nTicket: ${ticket.name}`);
      logger.info(`Workspace: .memento/tickets/${ticketId}/workspace/`);
      logger.info(`Progress: .memento/tickets/${ticketId}/progress.md`);
      logger.info(`Decisions: .memento/tickets/${ticketId}/decisions.md`);
    } catch (error) {
      logger.error(`Failed to resume ticket: ${error}`);
      process.exit(1);
    }
  });

// Close subcommand
ticketCommand
  .command('close <id>')
  .description('Close a ticket')
  .action(async (ticketId: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const ticket = await ticketManager.get(ticketId);
      
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        process.exit(1);
      }

      if (ticket.status === 'closed') {
        logger.info(`Ticket ${ticketId} is already closed`);
      } else {
        await ticketManager.close(ticketId);
        logger.success(`Closed ticket: ${ticketId}`);
      }
    } catch (error) {
      logger.error(`Failed to close ticket: ${error}`);
      process.exit(1);
    }
  });

// Search subcommand
ticketCommand
  .command('search <query>')
  .description('Search tickets by name or description')
  .action(async (query: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const tickets = await ticketManager.search(query);
      
      if (tickets.length === 0) {
        logger.info(`No tickets found matching: ${query}`);
        return;
      }

      logger.info(`\nFound ${tickets.length} ticket(s) matching "${query}":\n`);
      
      tickets.forEach(ticket => {
        const status = ticket.status === 'active' ? '🟢' : '⚪';
        logger.info(`${status} ${ticket.id}`);
        logger.info(`   Name: ${ticket.name}`);
        if (ticket.description) {
          logger.info(`   Description: ${ticket.description}`);
        }
        logger.info('');
      });
    } catch (error) {
      logger.error(`Failed to search tickets: ${error}`);
      process.exit(1);
    }
  });

export { ticketCommand };