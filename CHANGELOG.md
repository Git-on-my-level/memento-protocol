# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.4.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.4.0
[0.3.1]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.3.1
[0.3.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.3.0
[0.2.1]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.2.1
[0.2.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.2.0
[0.1.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.1.0