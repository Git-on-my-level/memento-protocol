# Contributing to zcc

Thank you for your interest in contributing to zcc!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/zcc.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build the project
npm run build

# Package for distribution
npm run package
```

## Code Style

- TypeScript with strict mode
- Functional programming patterns where appropriate
- Clear, self-documenting code
- Comprehensive error handling

## Testing

- Write tests for all new features
- Maintain >80% code coverage
- Run `npm test` before submitting PRs

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the README if adding new features
5. Submit PR with clear description

## Component Guidelines

When creating new component templates:
- Keep them focused and single-purpose
- Use clear, descriptive names
- Include usage examples
- Document any dependencies

### Mode Files

All mode files must include these sections:
- **Core Responsibilities**: What the mode focuses on
- **Done When**: Clear, testable completion criteria
- Other sections as appropriate for the mode

Example "Done When" section:
```markdown
## Done When

- Feature implementation complete
- All tests written and passing
- Code coverage above 80%
- Documentation updated
```

## Questions?

Feel free to open an issue for any questions or discussions.