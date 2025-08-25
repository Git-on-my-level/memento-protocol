# Remove redundant 'command' CLI command

## Description
The `command` CLI command is redundant since custom commands are automatically generated during `init` and `update` operations. Removing it will simplify the CLI surface area and reduce maintenance burden.

## Tasks
- [ ] Remove src/commands/command.ts
- [ ] Remove command registration from src/cli.ts
- [ ] Update tests to remove command-related tests
- [ ] Update documentation to remove references to the command command
- [ ] Verify custom commands still generate properly during init/update

## Notes
- Custom command generation happens in commandGenerator.ts and is called by init/update
- This is a breaking change but minor since users rarely use this command directly
- Part of the "zsh for Claude Code" simplification effort

---
Created: 2025-08-25T04:43:06.901Z
