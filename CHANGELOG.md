# Changelog

All notable changes to zcc will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-09-05

### Added
- Add --non-interactive flags for CI/automation support (#66)
- Complete v1.0 release preparation with comprehensive refactoring (#59)
- Improve error handling and validation for zcc update command (#55)
- Implement registry pattern for extensible component system (#54)
- Complete rename from memento-protocol to zcc (#52)
- Add ast-grep focused integration with Advanced Code Refactoring starter pack (#51)
- Improve error messages with actionable suggestions (#48)
- Add specific error types for better debugging (#49)
- Implement filesystem test isolation with memfs (#38) (#40)
- Implement starter packs for instant Claude Code configuration (#37)
- Improve acronym command ergonomics with bulk operations (#33)
- Self-describing templates with YAML frontmatter (#31)

### Fixed
- resolve starter pack component resolution issue (#68) (#69)
- Update documentation command references from memento to zcc for v1.0 (#64)
- resolve npm run dev ERR_PACKAGE_PATH_NOT_EXPORTED error (#60) (#65)
- Implement proper filtering for list --installed flag (#67)

### Changed
- Simplify MementoCore by removing unused functionality (#36)
- Clean configuration system with directory-based architecture (#35)
- Remove redundant 'command' CLI command (#32)
- Embrace "zsh for Claude Code" positioning (#28)

### Chore
- prepare for v1.0.0 release

## [0.9.0] - 2025-08-13

### Added
- **Ticket Sessions**: Add session tracking support for tickets to improve continuity across edits (#11)
- **File Content Analyzer Agent**: New agent for large file summarization to aid navigation and review (#19)

### Changed
- Improve `/ticket` command clarity and reduce confusion in Claude Code routing (#17)

### Fixed
- Ticket command regression and dependency validation improvements (#21)
- Test typing in `commandGenerator` to satisfy strict TypeScript checks

## [0.8.0] - 2025-08-02

### Documentation
-  update CLAUDE.md and README.md for v0.7.0 features (#10)

### Changed
- Enhance zcc with new hooks and scripts for project context and git status
- Remove security-guard hook, automate metadata.json generation (#12)

## [0.7.1] - 2025-08-01

### Fixed
- **Hook Script Creation**: Fixed issue where hook scripts weren't being created when only hooks were selected during installation, ensuring proper hook functionality regardless of component selection

## [0.7.0] - 2025-08-01

### Added
- **Claude Code Subagent Support**: Complete implementation of Claude Code subagent system with agent templates, CLI commands (`memento add agent`, `memento list agents`), and proper `.claude/agents/` directory integration
- **Custom Command Enhancements**: Fixed permission generation for custom commands (`/mode`, `/ticket`) with proper Claude Code format support
- **Enhanced Mode Switching**: Added fuzzy matching support for modes including exact match, substring match, and acronym matching (e.g., `apm` → `autonomous-project-manager`)
- **Claude Code Research Agent**: Built-in specialist agent for staying updated on Claude Code features and best practices

### Changed
- **GitHub Workflow Integration**: Added automated CI/CD workflow for Claude Code projects
- **Hook System Improvements**: Refactored hook system with focused responsibilities and better error handling
- **Permission Generation**: Fixed custom command permission format to work correctly with Claude Code's security model

### Fixed
- Custom commands (`/mode` and `/ticket`) now work with proper permissions
- Mode switching supports fuzzy matching and acronym shortcuts
- Agent installation properly targets `.claude/agents/` directory

## [0.6.0] - 2025-07-31

### Added
- enhance hook system with modular architecture and templates (#5)
- add intelligent ticket context injection to routing hook (#4)

## [0.5.3] - 2025-07-25

### Fixed
- Fixed hardcoded version "0.1.0" in CLI - now properly reads version from package.json during build
- Added version injection to build process using esbuild define option

## [0.5.2] - 2025-07-25

### Fixed
- Fixed package.json main field pointing to non-existent dist/index.js file
- Corrected main field to point to dist/cli.js for proper package resolution

## [0.5.1] - 2025-07-25

### Fixed
- Fixed CLI executable missing shebang line causing "command not found" errors
- Improved build process to ensure proper shebang addition and verification
- Removed TypeScript compilation interference with esbuild output

## [0.5.0] - 2025-07-25

### Added
-  add ticket hook support and path-based triggering (#3)

## [0.4.0] - 2025-07-24

### Added
-  Replace CLAUDE.md with Claude Code hooks for routing (#2)

## [0.3.1] - 2025-07-20

### Fixed
- Fixed upsert command failing on uninitialized projects - now automatically initializes .zcc directory structure
- Fixed ComponentInstaller tests to properly mock DirectoryManager.isInitialized method

## [0.3.0] - 2025-07-20

### Added
- OpenMemory MCP workflow for enhanced memory management

### Changed
- Re-add upsert functionality and re-initialize .zcc directory
- Improve router prompt reliability for better mode detection
- Improve update mechanism performance
- Remove backup feature for simplified architecture

### Fixed
- updateManager tests now passing correctly

## [0.2.1] - 2025-07-16

### Changed
- Fix path resolution in npm and npx
- Streamline npm publish

## [0.2.0] - 2025-07-16

### Added
- Fully non-interactive setup support for automated environments
- Custom npm publish workflow for streamlined releases
- New AI-focused modes: ai-debt-maintainer and autonomous-project-manager
- Enhanced mode templates with better examples and instructions

### Changed
- Improved mode and workflow loading mechanism for better customization
- Default mode now more useful with architect mode
- Removed hard-coded suggestions for more flexibility
- Enhanced mode adherence in CLAUDE.md instructions
- Updated README to better reflect target market

### Removed
- Language configuration system (simplified approach)

### Fixed
- Git repository URL in package.json

## [0.1.0] - 2025-07-15

### Added
- Initial release of zcc (formerly Memento Protocol)
- Core CLI commands: init, add, list, ticket, config, update, language
- Mode system with built-in modes: architect, engineer, project-manager, reviewer
- Workflow templates: review, summarize
- Language override support
- Ticket-based state management
- Interactive setup wizard
- Component update system
- Comprehensive test suite with 80%+ coverage
- Standalone executable packaging
- Colored terminal output with progress indicators
- Verbose and debug modes
- User-friendly error handling with recovery suggestions

### Features
- Lightweight meta-framework for Claude Code
- CLAUDE.md as minimal router
- Lazy-loading architecture
- File-based component system
- Cross-platform support (macOS, Linux)
- npm and standalone distribution

[1.0.0]: https://github.com/git-on-my-level/zcc/releases/tag/v1.0.0
[0.9.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.9.0
[0.8.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.8.0
[0.7.1]: https://github.com/git-on-my-level/zcc/releases/tag/v0.7.1
[0.7.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.7.0
[0.6.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.6.0
[0.5.3]: https://github.com/git-on-my-level/zcc/releases/tag/v0.5.3
[0.5.2]: https://github.com/git-on-my-level/zcc/releases/tag/v0.5.2
[0.5.1]: https://github.com/git-on-my-level/zcc/releases/tag/v0.5.1
[0.5.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.5.0
[0.4.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.4.0
[0.3.1]: https://github.com/git-on-my-level/zcc/releases/tag/v0.3.1
[0.3.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.3.0
[0.2.1]: https://github.com/git-on-my-level/zcc/releases/tag/v0.2.1
[0.2.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.2.0
[0.1.0]: https://github.com/git-on-my-level/zcc/releases/tag/v0.1.0