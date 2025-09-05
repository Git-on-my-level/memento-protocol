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

// Move subcommand - now accepts status as positional argument
ticketCommand
  .command('move <name> <status>')
  .description('Move a ticket to a different status (next, in-progress, done)')
  .action(async (name: string, status: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(status)) {
        logger.error(`Invalid status: ${status}. Must be one of: next, in-progress, done`);
        process.exit(1);
      }
      
      await ticketManager.move(name, status as TicketStatus);
      logger.success(`Moved ticket '${name}' to ${status}`);
    } catch (error) {
      logger.error(`Failed to move ticket: ${error}`);
      process.exit(1);
    }
  });

// Start subcommand - convenience for moving to in-progress
ticketCommand
  .command('start <name>')
  .description('Move a ticket to in-progress status')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.move(name, 'in-progress');
      logger.success(`Started ticket '${name}' (moved to in-progress)`);
    } catch (error) {
      logger.error(`Failed to start ticket: ${error}`);
      process.exit(1);
    }
  });

// Finish subcommand - convenience for moving to done
ticketCommand
  .command('finish <name>')
  .description('Move a ticket to done status')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.move(name, 'done');
      logger.success(`Finished ticket '${name}' (moved to done)`);
    } catch (error) {
      logger.error(`Failed to finish ticket: ${error}`);
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