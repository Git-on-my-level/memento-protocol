# Memento Protocol API Documentation

This document describes the programmatic API for extending and integrating with Memento Protocol.

## Core Classes

### DirectoryManager

Manages the `.memento` directory structure.

```typescript
import { DirectoryManager } from 'memento-protocol';

const manager = new DirectoryManager('/path/to/project');

// Check if initialized
const isInit = manager.isInitialized();

// Initialize structure
await manager.initializeStructure();

// Get paths
const modesPath = manager.getModesPath();
const workflowsPath = manager.getWorkflowsPath();
```

### ComponentInstaller

Handles component installation from templates.

```typescript
import { ComponentInstaller } from 'memento-protocol';

const installer = new ComponentInstaller('/path/to/project');

// Install a component
await installer.installComponent('mode', 'architect');

// List installed components
const installed = await installer.listInstalled();
```

### TicketManager

Manages the ticket-based state system.

```typescript
import { TicketManager } from 'memento-protocol';

const tickets = new TicketManager('/path/to/project');

// Create a ticket
const ticketId = await tickets.createTicket({
  title: 'Implement feature X',
  description: 'Detailed description...',
  priority: 'high'
});

// Update ticket status
await tickets.updateTicket(ticketId, { status: 'in-progress' });

// List tickets
const allTickets = await tickets.listTickets();
```

### ConfigManager

Handles configuration management.

```typescript
import { ConfigManager } from 'memento-protocol';

const config = new ConfigManager('/path/to/project');

// Get configuration value
const mode = await config.get('defaultMode');

// Set configuration value
await config.set('defaultMode', 'engineer');

// Get all configuration
const allConfig = await config.getAll();
```

### HookGenerator

Generates Claude Code hook infrastructure.

```typescript
import { HookGenerator } from 'memento-protocol';

const generator = new HookGenerator('/path/to/project');

// Generate hook infrastructure
await generator.generate();
```

## Error Handling

Memento Protocol provides custom error classes for better error handling:

```typescript
import { 
  MementoError,
  FileSystemError,
  ConfigurationError,
  ComponentError,
  NetworkError,
  ValidationError,
  handleError 
} from 'memento-protocol';

try {
  // Your code here
} catch (error) {
  if (error instanceof ComponentError) {
    console.log(`Component error: ${error.component}`);
    console.log(`Suggestion: ${error.suggestion}`);
  }
  
  // Or use the built-in handler
  handleError(error, verbose);
}
```

## Logger

Enhanced logger with color support and verbosity levels:

```typescript
import { logger } from 'memento-protocol';

// Set verbosity
logger.setVerbose(true);
logger.setDebug(true);

// Log messages
logger.info('Information message');
logger.success('Operation completed');
logger.warn('Warning message');
logger.error('Error message', error);
logger.debug('Debug information');
logger.verbose('Verbose details');

// Progress indicators
logger.progress('Processing');
// ... do work ...
logger.clearProgress();
logger.success('Processing complete');
```

## Plugin Development

To create a Memento Protocol plugin:

1. Import the necessary classes
2. Use the API to interact with components
3. Handle errors appropriately
4. Follow the component structure guidelines

Example plugin:

```typescript
import { 
  DirectoryManager,
  ComponentInstaller,
  logger 
} from 'memento-protocol';

export class MyPlugin {
  private dirManager: DirectoryManager;
  private installer: ComponentInstaller;
  
  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);
    this.installer = new ComponentInstaller(projectRoot);
  }
  
  async install() {
    if (!this.dirManager.isInitialized()) {
      throw new Error('Memento Protocol not initialized');
    }
    
    logger.info('Installing my plugin...');
    
    // Add custom components
    await this.installer.installComponent('mode', 'my-custom-mode');
    
    logger.success('Plugin installed successfully');
  }
}
```

## Events

Future versions will support an event system for lifecycle hooks:

```typescript
// Coming in future versions
memento.on('component:installed', (type, name) => {
  console.log(`Component ${name} of type ${type} was installed`);
});

memento.on('ticket:created', (ticket) => {
  console.log(`New ticket created: ${ticket.title}`);
});
```