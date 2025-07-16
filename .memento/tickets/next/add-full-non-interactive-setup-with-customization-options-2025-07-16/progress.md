# Ticket: Add full non-interactive setup with customization options

## Description
Currently, non-interactive mode installs no components. We need to support full customization in non-interactive mode through:

1. CLI flags for component selection:
   - --modes <mode1,mode2,mode3> to specify modes to install
   - --workflows <workflow1,workflow2> to specify workflows
   - --all-recommended to install all recommended components
   
2. Config file support:
   - --config <path-to-config.json> to read setup configuration
   - Config file should support:
     {
       "modes": ["architect", "engineer"],
       "workflows": ["review", "summarize"],
       "defaultMode": "engineer",
       "addToGitignore": true
     }

3. Environment variable support:
   - MEMENTO_MODES=architect,engineer
   - MEMENTO_WORKFLOWS=review,summarize
   - MEMENTO_DEFAULT_MODE=engineer

This enables fully automated setup in CI/CD environments while maintaining flexibility.

## Progress Log
- 2025-07-16T05:19:37.822Z: Ticket created

## Next Steps
- [ ] Define objectives
- [ ] Begin implementation

