# Pack Isolation: Copy-with-Tracking Implementation Plan

## Problem Statement

Current pack management has critical issues that prevent safe use of external packs:
- No ownership tracking of installed files
- Scripts are shared globally, causing conflicts
- Uninstall can remove files needed by other packs
- No way to detect if user modified pack files
- Cannot safely update packs without breaking modifications

## Proposed Solution: Copy-with-Tracking

### Core Concept
- Copy pack files to active directories (rather than symlinks)
- Track ownership and checksums of every installed file
- Fail installation on conflicts (no multi-pack conflicts supported)
- Only remove unmodified files owned by the pack during uninstall

### Implementation Plan

#### 1. File Registry Structure
```json
// .zcc/file-registry.json
{
  "version": "1.0.0",
  "files": {
    ".zcc/modes/engineer.md": {
      "pack": "essentials",
      "originalPath": "templates/starter-packs/essentials/modes/engineer.md", 
      "checksum": "sha256:abc123...",
      "installedAt": "2025-01-01T00:00:00Z",
      "modified": false
    },
    ".zcc/scripts/mode-switch.sh": {
      "pack": "essentials",
      "originalPath": "templates/starter-packs/essentials/scripts/mode-switch.sh",
      "checksum": "sha256:def456...",
      "installedAt": "2025-01-01T00:00:00Z",
      "modified": false
    },
    ".claude/agents/session-summarizer.md": {
      "pack": "essentials",
      "originalPath": "templates/starter-packs/essentials/agents/session-summarizer.md",
      "checksum": "sha256:ghi789...",
      "installedAt": "2025-01-01T00:00:00Z",
      "modified": false
    }
  },
  "packs": {
    "essentials": {
      "version": "1.0.0",
      "files": [
        ".zcc/modes/engineer.md",
        ".zcc/scripts/mode-switch.sh",
        ".claude/agents/session-summarizer.md"
      ]
    }
  }
}
```

#### 2. Installation Flow

```typescript
async installPack(pack: PackStructure, options: PackInstallOptions) {
  const registry = await loadFileRegistry();
  
  // Phase 1: Conflict Detection
  const conflicts = [];
  for (const component of pack.getAllComponents()) {
    const targetPath = getTargetPath(component);
    if (registry.files[targetPath] && !options.force) {
      conflicts.push({
        path: targetPath,
        existingPack: registry.files[targetPath].pack,
        newPack: pack.name
      });
    }
  }
  
  if (conflicts.length > 0) {
    throw new Error(`Installation failed: conflicts detected\n${formatConflicts(conflicts)}`);
  }
  
  // Phase 2: Copy Files with Tracking
  const installedFiles = [];
  for (const component of pack.getAllComponents()) {
    const sourcePath = component.path;
    const targetPath = getTargetPath(component);
    const checksum = await calculateChecksum(sourcePath);
    
    await copyFile(sourcePath, targetPath);
    
    registry.files[targetPath] = {
      pack: pack.name,
      originalPath: sourcePath,
      checksum: checksum,
      installedAt: new Date().toISOString(),
      modified: false
    };
    
    installedFiles.push(targetPath);
  }
  
  // Phase 3: Update Registry
  registry.packs[pack.name] = {
    version: pack.version,
    files: installedFiles
  };
  
  await saveFileRegistry(registry);
}
```

#### 3. Uninstallation Flow

```typescript
async uninstallPack(packName: string) {
  const registry = await loadFileRegistry();
  const packInfo = registry.packs[packName];
  
  if (!packInfo) {
    throw new Error(`Pack '${packName}' is not installed`);
  }
  
  const removed = [];
  const skipped = [];
  
  for (const filePath of packInfo.files) {
    const fileInfo = registry.files[filePath];
    
    if (!fileInfo) {
      // File registry inconsistent, skip
      continue;
    }
    
    // Check if file was modified
    const currentChecksum = await calculateChecksum(filePath);
    if (currentChecksum !== fileInfo.checksum) {
      skipped.push({
        path: filePath,
        reason: 'modified'
      });
      continue;
    }
    
    // Safe to remove
    await removeFile(filePath);
    delete registry.files[filePath];
    removed.push(filePath);
  }
  
  // Clean up empty directories
  await cleanEmptyDirectories(['.zcc/modes', '.zcc/scripts', '.zcc/workflows', '.claude/agents']);
  
  // Remove pack from registry
  delete registry.packs[packName];
  await saveFileRegistry(registry);
  
  return { removed, skipped };
}
```

#### 4. Update Detection

```typescript
async detectModifications() {
  const registry = await loadFileRegistry();
  const modifications = [];
  
  for (const [path, info] of Object.entries(registry.files)) {
    const currentChecksum = await calculateChecksum(path);
    if (currentChecksum !== info.checksum) {
      info.modified = true;
      modifications.push(path);
    }
  }
  
  await saveFileRegistry(registry);
  return modifications;
}
```

#### 5. Target Path Mapping

```typescript
function getTargetPath(component: Component): string {
  const { type, name } = component;
  
  switch (type) {
    case 'modes':
      return `.zcc/modes/${name}.md`;
    case 'workflows':
      return `.zcc/workflows/${name}.md`;
    case 'scripts':
      return `.zcc/scripts/${name}`;
    case 'agents':
      return `.claude/agents/${name}.md`;
    case 'hooks':
      return `.zcc/hooks/${name}.json`;
    case 'commands':
      return `.claude/commands/${name}.md`;
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}
```

### Benefits

1. **Simple**: No symlinks, just files and a registry
2. **Safe**: Won't delete modified files or files from other packs
3. **Traceable**: Know exactly what each pack installed
4. **Updatable**: Can detect modifications and handle updates appropriately
5. **Cross-platform**: Works identically on all operating systems

### Migration Path

1. Detect existing non-pack files (legacy)
2. Optionally adopt them into a "local" pseudo-pack
3. Start fresh file registry for new installations

### Error Handling

- **Conflict**: Fail fast with clear error message
- **Modified files**: Skip removal, warn user
- **Corrupted registry**: Rebuild from file system scan
- **Missing files**: Log warning, continue operation

### Testing Requirements

- [ ] Install pack with no conflicts
- [ ] Install pack with conflicts (should fail)
- [ ] Uninstall pack with unmodified files
- [ ] Uninstall pack with modified files (should skip)
- [ ] Install, modify file, uninstall (file should remain)
- [ ] Registry corruption recovery
- [ ] Empty directory cleanup

### Future Enhancements (Out of Scope)

- Conflict resolution strategies (rename, merge, etc.)
- Pack updates with diff detection
- Dependency resolution between packs
- Version constraints and compatibility

### Implementation Checklist

- [ ] Create FileRegistry class
- [ ] Add checksum calculation utilities
- [ ] Update PackInstaller with tracking
- [ ] Implement conflict detection
- [ ] Add modification detection
- [ ] Update uninstall to respect modifications
- [ ] Add registry corruption recovery
- [ ] Write comprehensive tests
- [ ] Update documentation

## Questions for Review

1. Should we use SHA-256 or a faster hash like xxHash for checksums?
2. Should the registry be in `.zcc/` or at project root?
3. Should we track file permissions as well as content?
4. How should we handle binary files (if any)?
5. Should we add a `--force` flag to override conflicts?