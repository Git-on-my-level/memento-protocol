# zcc API Documentation

This document describes the programmatic API for extending and integrating with zcc.

> **Note**: The primary way to use zcc is through the CLI. This API documentation is for advanced users who want to integrate zcc programmatically.

## Core Classes

### DirectoryManager

Manages the `.zcc` directory structure.

```typescript
import { DirectoryManager } from 'zcc';

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
import { ComponentInstaller } from 'zcc';

const installer = new ComponentInstaller('/path/to/project');

// Install a component
await installer.installComponent('mode', 'architect');

// List installed components
const installed = await installer.listInstalled();
```

### TicketManager

Manages the ticket-based state system.

```typescript
import { TicketManager } from 'zcc';

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
import { ConfigManager } from 'zcc';

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
import { HookGenerator } from 'zcc';

const generator = new HookGenerator('/path/to/project');

// Generate hook infrastructure
await generator.generate();
```

## Error Handling

zcc provides custom error classes for better error handling:

```typescript
import { 
  MementoError,
  FileSystemError,
  ConfigurationError,
  ComponentError,
  NetworkError,
  ValidationError,
  handleError 
} from 'zcc';

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
import { logger } from 'zcc';

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

To create a zcc plugin:

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
} from 'zcc';

export class MyPlugin {
  private dirManager: DirectoryManager;
  private installer: ComponentInstaller;
  
  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);
    this.installer = new ComponentInstaller(projectRoot);
  }
  
  async install() {
    if (!this.dirManager.isInitialized()) {
      throw new Error('zcc not initialized');
    }
    
    logger.info('Installing my plugin...');
    
    // Add custom components
    await this.installer.installComponent('mode', 'my-custom-mode');
    
    logger.success('Plugin installed successfully');
  }
}
```

## Hook System API

### HookManager

Manages Claude Code hooks for automation and customization.

```typescript
import { HookManager } from 'zcc';

const hooks = new HookManager('/path/to/project');

// Initialize hook system
await hooks.initialize();

// Create hook from template
await hooks.createHookFromTemplate('acronym-expander', {
  enabled: true
});

// List available templates
const templates = await hooks.listTemplates();
// Returns: ['git-context-loader', 'acronym-expander', 'project-overview']

// Get all configured hooks
const allHooks = hooks.getAllHooks();
// Returns array of { event: HookEvent, hooks: HookConfig[] }

// Add custom hook
await hooks.addHook({
  id: 'my-hook',
  name: 'My Hook',
  event: 'PostToolUse',
  enabled: true,
  command: './my-script.sh',
  matcher: {
    type: 'tool',
    pattern: 'Write,Edit'
  }
});

// Remove hook
const removed = await hooks.removeHook('my-hook');
```

### AcronymManager

Manages project-specific acronym expansions.

```typescript
import { AcronymManager } from 'zcc';

const acronyms = new AcronymManager('/path/to/project');

// Add acronym (case-insensitive by default)
acronyms.add('api', 'Application Programming Interface');
acronyms.add('k8s', 'Kubernetes');

// Remove acronym
const removed = acronyms.remove('api'); // returns true if removed

// List all acronyms
const all = acronyms.list();
// Returns: { 'API': 'Application Programming Interface', 'K8S': 'Kubernetes' }

// Clear all acronyms
acronyms.clear();

// Get current settings
const settings = acronyms.getSettings();
// Returns: { caseSensitive: false, wholeWordOnly: true }

// Update settings
acronyms.updateSettings({
  caseSensitive: true,
  wholeWordOnly: false
});
```

## Events

Future versions will support an event system for lifecycle hooks:

```typescript
// Coming in future versions
zcc.on('component:installed', (type, name) => {
  console.log(`Component ${name} of type ${type} was installed`);
});

zcc.on('ticket:created', (ticket) => {
  console.log(`New ticket created: ${ticket.title}`);
});
```