# Remove redundant 'command' CLI command

## Description
The `command` CLI command is redundant since custom commands are automatically generated during `init` and `update` operations. Removing it will simplify the CLI surface area and reduce maintenance burden.

## Tasks
- [x] Remove src/commands/command.ts
- [x] Remove command registration from src/cli.ts
- [x] Update tests to remove command-related tests (no specific tests existed)
- [x] Update documentation to remove references to the command command (none found)
- [x] Verify custom commands still generate properly during init/update

## Notes
- Custom command generation happens in commandGenerator.ts and is called by init/update
- This is a breaking change but minor since users rarely use this command directly
- Part of the "zsh for Claude Code" simplification effort

---
Created: 2025-08-25T04:43:06.901Z
