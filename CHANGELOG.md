# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Acronym expansion feature**: New `memento acronym` command for managing project-specific acronyms
  - `add`, `remove`, `list`, and `clear` subcommands
  - Automatic acronym expansion via new `acronym-expander` hook
  - Case-insensitive expansion with whole-word matching
  - Clean markdown glossary injection without text replacement
- **Enhanced hook system**: Improved HookManager with script-based hook support
  - Automatic script file creation from templates
  - Better hook deduplication logic needed
- **Hook selection in init**: Hooks can now be selected during interactive initialization
  - All built-in hooks selected by default
  - Support for `--hooks` flag in non-interactive mode
  - `MEMENTO_HOOKS` environment variable support
- **Documentation updates**: Comprehensive README overhaul with all features documented

### Fixed
- Fixed escaped newline characters (`\n`) appearing literally in hook list output
- Made test suites resilient to future hook additions using flexible matchers

### Changed
- Init command now prompts for hook selection alongside modes and workflows
- `--all-recommended` flag now includes all available hooks

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
- Fixed upsert command failing on uninitialized projects - now automatically initializes .memento directory structure
- Fixed ComponentInstaller tests to properly mock DirectoryManager.isInitialized method

## [0.3.0] - 2025-07-20

### Added
- OpenMemory MCP workflow for enhanced memory management

### Changed
- Re-add upsert functionality and re-initialize .memento directory
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
- Initial release of Memento Protocol
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

[0.5.3]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.5.3
[0.5.2]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.5.2
[0.5.1]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.5.1
[0.5.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.5.0
[0.4.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.4.0
[0.3.1]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.3.1
[0.3.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.3.0
[0.2.1]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.2.1
[0.2.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.2.0
[0.1.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.1.0