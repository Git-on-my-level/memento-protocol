# External Pack Support

zcc now supports installing community packs from external sources, transforming it into a community-driven ecosystem similar to oh-my-zsh.

## Features

### 🚀 Multiple Pack Sources
- **Local**: Built-in packs from the zcc repository
- **GitHub**: Install packs directly from GitHub repositories
- **HTTP**: (Coming soon) Install from web URLs
- **Custom**: (Coming soon) Plugin your own source types

### 🔒 Security & Trust Management
- Trust policy enforcement
- User consent for untrusted sources
- Security validation and threat scanning
- Audit trail of all installations
- Configurable allowed/blocked domains

### 🔍 Pack Discovery
- Search across all configured sources
- Filter by category, tags, author
- Interactive installation from search results
- Pack metadata and dependency information

## Quick Start

### Adding a GitHub Source

```bash
# Add a GitHub repository as a pack source
zcc source add my-packs --type github --owner username --repo pack-repo

# Add with trust (skip security warnings)
zcc source add trusted-packs --type github --owner myorg --repo packs --trust

# Add a private repository (requires GitHub token)
zcc source add private --type github --owner company --repo internal-packs --token ghp_xxxxx
```

### Managing Sources

```bash
# List all configured sources
zcc source list
zcc source list --verbose  # Show pack counts and details

# Enable/disable sources
zcc source disable my-packs
zcc source enable my-packs

# Remove a source
zcc source remove my-packs

# Set default source for pack installation
zcc source set-default my-packs
```

### Trust Management

```bash
# Check if a source is trusted
zcc source trust my-packs --check

# Add source to trusted list
zcc source trust my-packs --add

# Remove source from trusted list
zcc source trust my-packs --remove
```

### Searching and Installing Packs

```bash
# Search for packs across all sources
zcc search
zcc search react  # Search by keyword

# Search with filters
zcc search --category frontend
zcc search --tags typescript,react
zcc search --author zcc-community
zcc search --source my-packs  # Search specific source only

# Show source for each pack in results
zcc search --show-source

# Install a pack (will prompt for source if multiple matches)
zcc add pack my-awesome-pack

# Install with automatic consent for untrusted sources
zcc add pack my-pack --force
```

## Configuration

### Source Configuration

Sources are stored in `.zcc/sources.json`:

```json
{
  "sources": [
    {
      "id": "local",
      "type": "local",
      "enabled": true,
      "priority": 1,
      "config": {
        "path": "templates"
      }
    },
    {
      "id": "community",
      "type": "github",
      "enabled": true,
      "priority": 10,
      "config": {
        "owner": "zcc-community",
        "repo": "packs",
        "branch": "main",
        "directory": "packs",
        "trustLevel": "untrusted"
      }
    }
  ],
  "defaultSource": "local"
}
```

### Trust Policy

Security settings in `.zcc/security/trust-policy.json`:

```json
{
  "allowUntrustedSources": false,
  "requireUserConsent": true,
  "auditInstallations": true,
  "maxPackSize": 10485760,
  "allowedDomains": ["github.com", "gitlab.com"],
  "blockedDomains": [],
  "trustedAuthors": ["zcc", "zcc-community"],
  "trustedSources": ["local", "zcc-official"]
}
```

## Creating a Pack Repository

To share your packs with the community:

### 1. Repository Structure

```
my-packs-repo/
├── packs/
│   ├── my-first-pack/
│   │   ├── manifest.json
│   │   ├── modes/
│   │   │   └── custom-mode.md
│   │   ├── workflows/
│   │   │   └── custom-workflow.md
│   │   └── README.md
│   └── another-pack/
│       ├── manifest.json
│       └── ...
└── README.md
```

### 2. Pack Manifest

Each pack needs a `manifest.json`:

```json
{
  "name": "my-awesome-pack",
  "version": "1.0.0",
  "description": "An awesome pack for zcc",
  "author": "your-name",
  "category": "frontend",
  "tags": ["react", "typescript"],
  "dependencies": [],
  "components": {
    "modes": [
      { "name": "custom-mode", "required": true }
    ],
    "workflows": [
      { "name": "custom-workflow", "required": false }
    ]
  }
}
```

### 3. Share Your Repository

Once your repository is ready:

1. Push to GitHub
2. Share the installation command:
   ```bash
   zcc source add your-packs --type github --owner yourusername --repo your-packs-repo
   ```

## Security Best Practices

### For Pack Users

1. **Verify Sources**: Only add sources from trusted developers
2. **Review Warnings**: Pay attention to security warnings during installation
3. **Check Manifests**: Review pack manifests before installation
4. **Use Trust Sparingly**: Only mark sources as trusted if you fully trust the author
5. **Audit Regularly**: Check `.zcc/security/trust-records.json` for installation history

### For Pack Authors

1. **No Malicious Code**: Never include malicious or obfuscated code
2. **Clear Documentation**: Document what your pack does
3. **Minimal Permissions**: Request only necessary permissions
4. **Version Properly**: Use semantic versioning
5. **Test Thoroughly**: Ensure packs work across different environments

## Troubleshooting

### Common Issues

**Pack not found from external source**
- Verify the source is enabled: `zcc source list`
- Check source configuration: `zcc source list --verbose`
- Ensure the pack exists in the repository

**Security validation failed**
- Review security warnings carefully
- Check if the source needs to be trusted: `zcc source trust <source> --add`
- Use `--force` flag to bypass consent (use with caution)

**GitHub API rate limits**
- Add a GitHub personal access token: `--token ghp_xxxxx`
- Tokens increase rate limits from 60 to 5000 requests/hour

**Cache issues**
- Clear pack cache: `rm -rf .zcc/.cache/packs`
- Force refresh: `zcc search --no-cache` (coming soon)

## Examples

### Setting up a team pack repository

```bash
# Team lead creates and shares the repository
zcc source add team-packs \
  --type github \
  --owner mycompany \
  --repo team-packs \
  --trust

# Team members can then search and install
zcc search --source team-packs
zcc add pack team-standard-setup
```

### Using multiple pack sources

```bash
# Add official community packs
zcc source add zcc-community \
  --type github \
  --owner zcc-community \
  --repo official-packs

# Add experimental packs
zcc source add zcc-experimental \
  --type github \
  --owner zcc-community \
  --repo experimental-packs

# Search across all sources
zcc search --show-source

# Install from specific source
zcc search --source zcc-experimental
```

## Future Enhancements

- **Pack Registry**: Central registry for discovering packs
- **Ratings & Reviews**: Community feedback on packs
- **Auto-updates**: Automatic pack updates with version control
- **Pack Publishing**: CLI commands to publish packs
- **Dependency Resolution**: Automatic dependency installation
- **Pack Signing**: Cryptographic signatures for pack verification

## Contributing

We welcome contributions to the external pack ecosystem!

- **Create Packs**: Share your custom modes, workflows, and agents
- **Improve Security**: Help enhance the trust and validation system
- **Add Sources**: Implement new source types (HTTP, S3, etc.)
- **Documentation**: Improve guides and examples

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.