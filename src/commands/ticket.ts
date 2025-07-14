import { Command } from 'commander';
import { TicketManager, TicketStatus } from '../lib/ticketManager';
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
      logger.info(`Status: next`);
      logger.info(`Workspace: .memento/tickets/next/${ticketId}/workspace/`);
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
        const statusIcon = ticket.status === 'done' ? '✅' : ticket.status === 'in-progress' ? '🔄' : '📋';
        logger.info(`${statusIcon} ${ticket.id}`);
        logger.info(`   Name: ${ticket.name}`);
        logger.info(`   Status: ${ticket.status}`);
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

      if (ticket.status === 'in-progress') {
        logger.info(`Ticket ${ticketId} is already in progress`);
      } else {
        await ticketManager.resume(ticketId);
        logger.success(`Resumed ticket: ${ticketId}`);
      }

      // Get updated ticket info after resume
      const updatedTicket = await ticketManager.get(ticketId);
      
      logger.info(`\nTicket: ${updatedTicket!.name}`);
      logger.info(`Status: ${updatedTicket!.status}`);
      logger.info(`Workspace: .memento/tickets/${updatedTicket!.status}/${ticketId}/workspace/`);
      logger.info(`Progress: .memento/tickets/${updatedTicket!.status}/${ticketId}/progress.md`);
      logger.info(`Decisions: .memento/tickets/${updatedTicket!.status}/${ticketId}/decisions.md`);
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

      if (ticket.status === 'done') {
        logger.info(`Ticket ${ticketId} is already done`);
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
        const statusIcon = ticket.status === 'done' ? '✅' : ticket.status === 'in-progress' ? '🔄' : '📋';
        logger.info(`${statusIcon} ${ticket.id}`);
        logger.info(`   Name: ${ticket.name}`);
        logger.info(`   Status: ${ticket.status}`);
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

// Move subcommand
ticketCommand
  .command('move <id> <status>')
  .description('Move a ticket to a different status (next, in-progress, done)')
  .action(async (ticketId: string, status: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(status)) {
        logger.error(`Invalid status: ${status}. Must be one of: next, in-progress, done`);
        process.exit(1);
      }
      
      const ticket = await ticketManager.get(ticketId);
      
      if (!ticket) {
        logger.error(`Ticket ${ticketId} not found`);
        process.exit(1);
      }

      await ticketManager.moveToStatus(ticketId, status as TicketStatus);
      logger.success(`Moved ticket ${ticketId} to ${status}`);
      logger.info(`Workspace: .memento/tickets/${status}/${ticketId}/workspace/`);
    } catch (error) {
      logger.error(`Failed to move ticket: ${error}`);
      process.exit(1);
    }
  });

// Migrate subcommand
ticketCommand
  .command('migrate')
  .description('Migrate existing tickets to the new directory structure')
  .action(async () => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.migrate();
      logger.info('Migration complete');
    } catch (error) {
      logger.error(`Failed to migrate tickets: ${error}`);
      process.exit(1);
    }
  });

export { ticketCommand };