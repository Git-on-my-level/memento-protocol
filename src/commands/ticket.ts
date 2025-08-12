import { Command } from 'commander';
import { TicketManager, TicketStatus } from '../lib/ticketManager';
import { logger } from '../lib/logger';

const ticketCommand = new Command('ticket')
  .description('Manage tickets for persistent workspace');

// Create subcommand
ticketCommand
  .command('create <name>')
  .description('Create a new ticket')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const ticketPath = await ticketManager.create(name);
      logger.success(`Created ticket: ${name}`);
      logger.info(`Location: ${ticketPath}`);
    } catch (error) {
      logger.error(`Failed to create ticket: ${error}`);
      process.exit(1);
    }
  });

// List subcommand
ticketCommand
  .command('list')
  .description('List all tickets')
  .action(async () => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const tickets = await ticketManager.list();
      
      if (tickets.length === 0) {
        logger.info('No tickets found.');
        return;
      }

      const ticketsByStatus: Record<string, string[]> = {
        'next': [],
        'in-progress': [],
        'done': []
      };

      tickets.forEach(ticket => {
        if (ticketsByStatus[ticket.status]) {
          ticketsByStatus[ticket.status].push(ticket.name);
        }
      });

      Object.entries(ticketsByStatus).forEach(([status, names]) => {
        if (names.length > 0) {
          logger.info(`\n${status}:`);
          names.forEach(name => {
            logger.info(`  - ${name}`);
          });
        }
      });
    } catch (error) {
      logger.error(`Failed to list tickets: ${error}`);
      process.exit(1);
    }
  });

// Move subcommand
ticketCommand
  .command('move <name>')
  .description('Move a ticket to a different status')
  .requiredOption('--to <status>', 'Target status (next, in-progress, done)')
  .action(async (name: string, options: { to: string }) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(options.to)) {
        logger.error(`Invalid status: ${options.to}. Must be one of: next, in-progress, done`);
        process.exit(1);
      }
      
      await ticketManager.move(name, options.to as TicketStatus);
      logger.success(`Moved ticket '${name}' to ${options.to}`);
    } catch (error) {
      logger.error(`Failed to move ticket: ${error}`);
      process.exit(1);
    }
  });

// Delete subcommand
ticketCommand
  .command('delete <name>')
  .description('Delete a ticket')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.delete(name);
      logger.success(`Deleted ticket: ${name}`);
    } catch (error) {
      logger.error(`Failed to delete ticket: ${error}`);
      process.exit(1);
    }
  });

export { ticketCommand };