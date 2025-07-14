# Publishing Guide

## NPM Publishing Workflow

### Prerequisites
- NPM account with publish permissions
- Clean working directory
- All tests passing

### Publishing Steps

1. **Version Bump**
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Pre-publish Checks**
   ```bash
   npm run test       # run all tests
   npm run build      # build the project
   npm pack          # test package creation
   ```

3. **Publish to NPM**
   ```bash
   npm publish
   ```

### Automated Publishing

The package.json includes a `prepublishOnly` script that automatically:
- Runs tests
- Builds the project
- Ensures dist/ directory exists

### Package Contents

The published package includes:
- `dist/` - Built CLI and templates
- `templates/` - Template files
- `README.md`, `LICENSE`, `CHANGELOG.md`
- `package.json`

Excluded via `.npmignore`:
- Source code (`src/`)
- Tests (`**/__tests__/`, `**/*.test.*`)
- Development files (`tsconfig.json`, `jest.config.js`)
- Build artifacts (`coverage/`, `test-*`)

### Installation Testing

Test the published package:
```bash
# Global installation
npm install -g memento-protocol

# NPX usage
npx memento-protocol --help

# Local development
git clone repo && npm install && npm link
```

### Troubleshooting

- **Build fails**: Check TypeScript compilation
- **Tests fail**: Run `npm test` locally first
- **Package size**: Check `.npmignore` excludes dev files
- **CLI not found**: Verify `bin` field in package.json