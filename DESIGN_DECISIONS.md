# Memento Protocol - Design Decisions Summary

This document summarizes the key design decisions made during the implementation of Memento Protocol, a lightweight meta-framework for Claude Code.

## Architecture Overview

The implementation strictly followed the principles laid out in `Design.md`, treating it as our "constitution". The core architecture achieved:

1. **Minimal Router Pattern**: CLAUDE.md remains at 32 lines, serving purely as navigation
2. **Lazy Loading**: Components load only when explicitly requested
3. **Explicit State Management**: File-based tickets provide session continuity
4. **Composable Components**: Modes, workflows, and language overrides work independently

## Phase-by-Phase Design Decisions

### Phase 1: Core Infrastructure

**Key Decisions:**
- **Build System**: Chose esbuild over webpack for faster builds and simpler configuration
- **CLI Framework**: Commander.js provides a clean, declarative API for command definition
- **TypeScript**: Strict mode enforced for better type safety and IDE support
- **Template Distribution**: Templates embedded directly in the bundle for true standalone executables

**Trade-offs:**
- Embedding templates increases bundle size but eliminates runtime dependencies
- TypeScript adds build complexity but prevents runtime errors

### Phase 2: Component Management

**Key Decisions:**
- **CLAUDE.md Generation**: Kept to 32 lines with clear sections for modes, workflows, and tickets
- **Project Detection**: Pattern-based detection using common project files (package.json, go.mod)
- **Mode Design**: Behavioral focus over technical instructions, emphasizing communication style
- **Workflow Structure**: Clear input/output contracts with language-specific sections

**Trade-offs:**
- Simple pattern matching over complex AST analysis for project detection
- Behavioral guidelines require more LLM interpretation but provide flexibility

### Phase 3: Project Integration

**Key Decisions:**
- **Ticket System**: File-based storage in `.memento/tickets/` for transparency
- **Configuration Hierarchy**: defaults → global → project → environment variables
- **Interactive Setup**: Balance between guidance and speed with -i and -q options
- **Ticket IDs**: Semantic name + timestamp format for human readability

**Trade-offs:**
- File-based tickets over database for simplicity and git-friendliness
- Configuration in JSON over YAML/TOML for native Node.js support

### Phase 4: State Management

**Key Decisions:**
- **Update Tracking**: SHA-256 hashes to detect local modifications
- **Language Detection**: Prioritized accuracy over speed with multiple detection patterns
- **Test Coverage**: Realistic 45% threshold over aspirational 80%
- **Backup Strategy**: Automatic backups before updates with timestamped directories

**Trade-offs:**
- Hash-based versioning over semantic versioning for simplicity
- Lower coverage threshold acknowledges CLI testing limitations

### Phase 5: Polish & Distribution

**Key Decisions:**
- **Error Handling**: Custom error class hierarchy with recovery suggestions
- **Documentation**: Minimal, focused docs split by audience (users, contributors, LLMs)
- **Distribution**: Multiple channels (npm, binary, homebrew) for user choice
- **Logging**: ANSI colors with fallback, verbosity levels for debugging

**Trade-offs:**
- Custom errors add complexity but improve user experience
- Multiple distribution channels increase maintenance but improve adoption

## Technical Constraints & Solutions

### Token Efficiency
- **Problem**: Keep CLAUDE.md under 50 lines to minimize token usage
- **Solution**: Router pattern with lazy loading, achieved 32 lines

### State Persistence
- **Problem**: Enable work continuity across Claude sessions
- **Solution**: File-based tickets with structured metadata and progress tracking

### Component Discovery
- **Problem**: Users need to understand available components
- **Solution**: Interactive setup with descriptions, list commands, and metadata.json

### Cross-Platform Compatibility
- **Problem**: Single executable for different platforms
- **Solution**: Node.js shebang with platform-specific wrappers via esbuild

## Success Metrics Achieved

1. ✅ **Token Efficiency**: CLAUDE.md at 32 lines (target: <50)
2. ✅ **Modularity**: Components fully independent and composable
3. ✅ **Discoverability**: Interactive setup and list commands
4. ✅ **Resumability**: Ticket system with resume command
5. ✅ **Composability**: Language overrides extend without modifying base

## Lessons Learned

1. **File-based systems** work well for CLI tools - transparent, debuggable, git-friendly
2. **Behavioral instructions** for LLMs more effective than technical specifications
3. **Progressive disclosure** in CLI design - simple commands with advanced options
4. **Test coverage** for CLIs needs realistic expectations due to I/O operations
5. **Error messages** with recovery suggestions dramatically improve user experience

## Future Considerations

While maintaining the non-goals from Design.md, potential enhancements could include:

1. **Component marketplace** - Community-contributed modes and workflows
2. **Ticket templates** - Pre-configured tickets for common tasks
3. **Integration hooks** - Pre/post command hooks for custom workflows
4. **Performance metrics** - Track which components are most useful

The implementation successfully created a minimal, efficient meta-framework that enhances Claude Code's capabilities while respecting token limits and maintaining simplicity.