# zcc API Documentation

This document describes the programmatic API for extending and integrating with zcc.

> **Note**: The primary way to use zcc is through the CLI. This API documentation is for advanced users who want to integrate zcc programmatically.

## Core Classes

### DirectoryManager

Manages the `.zcc` and `.claude` directory structure and essential scripts.

```typescript
import { DirectoryManager } from 'zcc';

const manager = new DirectoryManager('/path/to/project');

// Check if initialized
const isInit = manager.isInitialized();

// Initialize structure (safe: does not delete existing data)
await manager.initializeStructure();

// Ensure .zcc is in .gitignore
await manager.ensureGitignore();

// Resolve path to installed component
const modePath = manager.getComponentPath('modes', 'architect');
```


### TicketManager

Manages markdown tickets in `.zcc/tickets/{next|in-progress|done}`.

```typescript
import { TicketManager } from 'zcc';

const tm = new TicketManager('/path/to/project');

// Create a ticket (returns file path)
const path = await tm.create('implement-auth', { type: 'feature', priority: 'high' });

// Move ticket between statuses
await tm.move('implement-auth', 'in-progress');
await tm.move('implement-auth', 'done');

// List tickets
const allTickets = await tm.list();

// Delete a ticket
await tm.delete('implement-auth');
```

### ConfigManager

Manages YAML configuration with precedence: defaults → global (`~/.zcc/config.yaml`) → project (`.zcc/config.yaml`) → environment.

```typescript
import { ConfigManager } from 'zcc';

const cfg = new ConfigManager('/path/to/project');

// Get configuration value
const mode = await cfg.get('defaultMode');

// Set configuration value (project or global)
await cfg.set('defaultMode', 'engineer');
await cfg.set('ui.colorOutput', true, /* global */ true);

// List merged configuration
const merged = await cfg.list();

// Validate config file and optionally fix
const result = await cfg.validateConfigFile();
if (!result.valid) {
  await cfg.fixConfigFile();
}
```

### HookManager

Generates and manages Claude Code hook infrastructure.

```typescript
import { HookManager } from 'zcc';

const hooks = new HookManager('/path/to/project');

// Initialize (generates built-in routing hook and settings)
await hooks.initialize();

// Create a hook from a template
await hooks.createHookFromTemplate('acronym-expander', { id: 'acronyms', enabled: true });

// List available templates
  const templates = await hooks.listTemplates();
  ```

### StarterPackManager

Manages discovery, installation, and removal of starter packs.

```typescript
import { StarterPackManager } from 'zcc';

const packs = new StarterPackManager('/path/to/project');

// List available packs
const available = await packs.listPacks();

// Install a pack
await packs.installPack('essentials');

// Show installed packs
const installed = await packs.getInstalledPacks();

// Uninstall a pack
await packs.uninstallPack('essentials');
```

### PackInstaller

Lower-level utility for installing packs from loaded manifests.

```typescript
import { PackInstaller } from 'zcc';

const installer = new PackInstaller('/path/to/project');
// Assuming packStructure and source are obtained elsewhere
// await installer.installPack(packStructure, source, { force: true });
```

## Error Handling

zcc provides custom error classes for better error handling:

```typescript
import {
  ZccError,
  FileSystemError,
  ConfigurationError,
  ValidationError,
  handleError
} from 'zcc';

try {
  // Your code here
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.log(`Configuration error: ${error.message}`);
  }
  
  // Or use the built-in handler
  handleError(error, true);
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
logger.error('Error message');
logger.debug('Debug information');
```
