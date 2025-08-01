# Integrate Memento Protocol with Claude Code Custom Commands

## Overview
Create custom Claude Code commands that provide direct access to Memento Protocol's ticket and mode management features, enabling seamless workflow integration without leaving the Claude Code interface.

## Background
Claude Code supports custom commands through markdown files stored in `.claude/commands/` directories. These commands can execute bash scripts, accept arguments, and integrate with the Claude interface. By creating custom commands for Memento Protocol's features, we can eliminate context switching and provide a more integrated development experience.

## Requirements

### Core Features

1. **Ticket Management Commands**
   - `/ticket` - Interactive ticket management (create/list/move)
   - `/ticket:create <name>` - Create new ticket
   - `/ticket:list` - Show tickets organized by status
   - `/ticket:start <name>` - Move ticket to in-progress
   - `/ticket:done <name>` - Complete ticket
   - `/ticket:context <name>` - Load ticket context into conversation

2. **Mode Management Commands**
   - `/mode` - Switch between modes interactively
   - `/mode:list` - List available modes
   - `/mode:set <mode-name>` - Switch to specific mode
   - `/mode:current` - Show current active mode

3. **Workflow Commands**
   - `/memento:init` - Initialize Memento Protocol in project
   - `/memento:status` - Show current project state (tickets, modes, etc.)
   - `/memento:sync` - Regenerate CLAUDE.md with current state

### Technical Implementation

1. **Directory Structure**
   ```
   .claude/
   ├── commands/
   │   ├── ticket.md              # Main ticket command
   │   ├── ticket/
   │   │   ├── create.md
   │   │   ├── list.md
   │   │   ├── start.md
   │   │   ├── done.md
   │   │   └── context.md
   │   ├── mode.md                # Main mode command
   │   ├── mode/
   │   │   ├── list.md
   │   │   ├── set.md
   │   │   └── current.md
   │   └── memento/
   │       ├── init.md
   │       ├── status.md
   │       └── sync.md
   ```

2. **Command Templates**

   **Example: `/ticket:create` command**
   ```markdown
   ---
   allowed-tools: Bash(npx memento-protocol ticket create:*)
   argument-hint: <ticket-name>
   description: Create a new Memento Protocol ticket
   ---
   
   Creating ticket: $ARGUMENTS
   
   !`npx memento-protocol ticket create $ARGUMENTS`
   
   The ticket has been created. You can now start working on it using `/ticket:start $ARGUMENTS`.
   ```

   **Example: `/mode:set` command**
   ```markdown
   ---
   allowed-tools: Bash(cat:.memento/modes/*), Bash(echo:*)
   argument-hint: <mode-name>
   description: Switch to a specific Memento Protocol mode
   ---
   
   Switching to mode: $ARGUMENTS
   
   !`cat .memento/modes/$ARGUMENTS.md 2>/dev/null || echo "Mode '$ARGUMENTS' not found"`
   
   I'll now operate according to the $ARGUMENTS mode guidelines shown above.
   ```

   **Example: `/memento:status` command**
   ```markdown
   ---
   allowed-tools: Bash(npx memento-protocol ticket list), Bash(ls:.memento/modes/), Bash(cat:CLAUDE.md)
   description: Show current Memento Protocol project status
   ---
   
   # Memento Protocol Status
   
   ## Active Tickets
   !`npx memento-protocol ticket list`
   
   ## Available Modes
   !`ls -1 .memento/modes/ 2>/dev/null | sed 's/.md$//' || echo "No modes installed"`
   
   ## Current Configuration
   !`head -20 CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"`
   ```

3. **Installation Flow**
   - Add command generation to `memento init` process
   - Create `commandGenerator.ts` similar to `hookGenerator.ts`
   - Option to install commands separately: `memento install-commands`
   - Update commands when Memento Protocol updates

4. **Integration Points**
   - Commands call existing Memento CLI under the hood
   - Read ticket state directly from `.memento/tickets/`
   - Update CLAUDE.md when modes change
   - Maintain compatibility with existing CLI workflows

## Success Criteria
- [ ] Users can manage tickets entirely through Claude Code commands
- [ ] Mode switching works seamlessly within Claude conversations
- [ ] Commands provide helpful feedback and error messages
- [ ] Installation process is simple and documented
- [ ] Commands work in both project and user scope appropriately
- [ ] Existing CLI functionality remains unchanged

## Testing Plan
- [ ] Unit tests for command generation logic
- [ ] Integration tests for command templates
- [ ] Manual testing of all commands in Claude Code
- [ ] Test error handling for edge cases
- [ ] Verify bash command restrictions work properly
- [ ] Test command discovery and autocomplete

## Implementation Steps

### Phase 1: Foundation
1. Create `commandGenerator.ts` module
2. Define command template structure
3. Implement basic ticket commands (create, list)
4. Add command installation to init process
5. Test integration with Claude Code

### Phase 2: Complete Feature Set
1. Implement remaining ticket commands
2. Add mode management commands
3. Create workflow commands (init, status, sync)
4. Add namespace support for complex commands
5. Improve error handling and feedback

### Phase 3: Polish & Documentation
1. Add command descriptions to help system
2. Create user documentation
3. Add examples to command templates
4. Optimize bash command execution
5. Consider advanced features (interactive prompts)

## Notes
- Commands should feel native to Claude Code interface
- Maintain consistency with existing Memento CLI commands
- Focus on most common workflows first
- Consider security implications of bash execution
- Commands should be project-portable (no absolute paths)

## Dependencies
- Requires Claude Code with custom commands support
- Depends on existing Memento Protocol CLI
- Should work with all Memento Protocol versions

## Future Enhancements
- Interactive command builders using Claude's capabilities
- Commands that integrate with subagents (from previous ticket)
- Workflow automation commands
- Team collaboration commands
- Performance tracking commands