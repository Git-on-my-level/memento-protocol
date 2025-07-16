# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.2.0
[0.1.0]: https://github.com/git-on-my-level/memento-protocol/releases/tag/v0.1.0