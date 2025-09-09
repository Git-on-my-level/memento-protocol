/**
 * Integration tests for PackInstaller with FileRegistry
 * Tests the complete pack installation and uninstallation flow with file tracking
 */

import { PackInstaller } from '../PackInstaller';
import { FileRegistry } from '../FileRegistry';
import { PackStructure } from '../../types/packs';
import { createTestFileSystem } from '../../testing';
import { MemoryFileSystemAdapter } from '../../adapters/MemoryFileSystemAdapter';
import { LocalPackSource } from '../PackSource';

// Mock DirectoryManager to prevent actual filesystem operations
jest.mock('../../directoryManager');
jest.mock('../../logger');

describe('PackInstaller Integration with FileRegistry', () => {
  let installer: PackInstaller;
  let registry: FileRegistry;
  let fs: MemoryFileSystemAdapter;
  let packSource: LocalPackSource;
  const projectRoot = '/test-project';

  const createTestPack = (name: string, components: any = {}): PackStructure => ({
    manifest: {
      name,
      version: '1.0.0',
      description: `Test pack ${name}`,
      author: 'test',
      components: components || {
        modes: [{ name: `${name}-mode`, required: true }],
        workflows: [{ name: `${name}-workflow`, required: true }],
      },
      tags: ['test'],
      category: 'general'
    },
    path: `/packs/${name}`
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with multiple packs
    fs = await createTestFileSystem({
      // Pack A
      '/packs/pack-a/manifest.json': JSON.stringify(createTestPack('pack-a').manifest),
      '/packs/pack-a/modes/pack-a-mode.md': '# Pack A Mode\nContent for pack A mode',
      '/packs/pack-a/workflows/pack-a-workflow.md': '# Pack A Workflow\nContent for pack A workflow',
      '/packs/pack-a/scripts/helper.sh': '#!/bin/bash\necho "Pack A helper"',
      
      // Pack B (has conflict with Pack A)
      '/packs/pack-b/manifest.json': JSON.stringify(createTestPack('pack-b').manifest),
      '/packs/pack-b/modes/pack-b-mode.md': '# Pack B Mode\nContent for pack B mode',
      '/packs/pack-b/workflows/pack-b-workflow.md': '# Pack B Workflow\nContent for pack B workflow',
      '/packs/pack-b/scripts/helper.sh': '#!/bin/bash\necho "Pack B helper"', // Conflicts with Pack A
      
      // Pack C (no conflicts)
      '/packs/pack-c/manifest.json': JSON.stringify(createTestPack('pack-c').manifest),
      '/packs/pack-c/modes/pack-c-mode.md': '# Pack C Mode\nContent for pack C mode',
      '/packs/pack-c/workflows/pack-c-workflow.md': '# Pack C Workflow\nContent for pack C workflow',
      '/packs/pack-c/scripts/unique-script.sh': '#!/bin/bash\necho "Pack C unique"',
    });

    packSource = new LocalPackSource('/packs', fs);
    registry = new FileRegistry(projectRoot, fs);
    installer = new PackInstaller(projectRoot, fs);

    // Mock DirectoryManager
    const mockDirectoryManager = require('../../directoryManager').DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);
  });

  describe('Installation with File Tracking', () => {
    it('should track all installed files with checksums', async () => {
      const packA = createTestPack('pack-a');
      
      const result = await installer.installPack(packA, packSource);
      
      expect(result.success).toBe(true);
      
      // Verify files were tracked in registry
      const modeInfo = await registry.getFileInfo(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      expect(modeInfo).toBeDefined();
      expect(modeInfo?.pack).toBe('pack-a');
      expect(modeInfo?.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
      
      const workflowInfo = await registry.getFileInfo(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`);
      expect(workflowInfo).toBeDefined();
      expect(workflowInfo?.pack).toBe('pack-a');
      
      const scriptInfo = await registry.getFileInfo(`${projectRoot}/.zcc/scripts/helper.sh`);
      expect(scriptInfo).toBeDefined();
      expect(scriptInfo?.pack).toBe('pack-a');
      
      // Verify pack is registered
      const packFiles = await registry.getPackFiles('pack-a');
      expect(packFiles).toHaveLength(3);
    });

    it('should detect and fail on file conflicts between packs', async () => {
      const packA = createTestPack('pack-a');
      const packB = createTestPack('pack-b');
      
      // Install Pack A first
      const resultA = await installer.installPack(packA, packSource);
      expect(resultA.success).toBe(true);
      
      // Try to install Pack B which has conflicting script
      const resultB = await installer.installPack(packB, packSource);
      
      expect(resultB.success).toBe(false);
      expect(resultB.errors).toContain(
        "Conflict: Script 'helper.sh' conflicts with pack 'pack-a'"
      );
      
      // Verify Pack B files were not installed
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-b-mode.md`)).toBe(false);
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/pack-b-workflow.md`)).toBe(false);
      
      // Verify Pack A files remain intact
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/helper.sh`)).toBe(true);
    });

    it('should allow force installation to replace existing pack', async () => {
      const packA = createTestPack('pack-a');
      const packB = createTestPack('pack-b');
      
      // Install Pack A
      await installer.installPack(packA, packSource);
      
      // Force install Pack B
      const result = await installer.installPack(packB, packSource, { force: true });
      
      expect(result.success).toBe(true);
      
      // Verify Pack B files were installed
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-b-mode.md`)).toBe(true);
      
      // Verify script is now owned by Pack B
      const scriptInfo = await registry.getFileInfo(`${projectRoot}/.zcc/scripts/helper.sh`);
      expect(scriptInfo?.pack).toBe('pack-b');
      
      // Verify script content is from Pack B
      const scriptContent = await fs.readFile(`${projectRoot}/.zcc/scripts/helper.sh`, 'utf-8');
      expect(scriptContent).toContain('Pack B helper');
    });

    it('should handle multiple non-conflicting packs', async () => {
      const packA = createTestPack('pack-a');
      const packC = createTestPack('pack-c');
      
      // Install both packs
      const resultA = await installer.installPack(packA, packSource);
      const resultC = await installer.installPack(packC, packSource);
      
      expect(resultA.success).toBe(true);
      expect(resultC.success).toBe(true);
      
      // Verify both packs' files exist
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-c-mode.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/helper.sh`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/unique-script.sh`)).toBe(true);
      
      // Verify registry tracks both packs
      const packAFiles = await registry.getPackFiles('pack-a');
      const packCFiles = await registry.getPackFiles('pack-c');
      
      expect(packAFiles).toHaveLength(3);
      expect(packCFiles).toHaveLength(3);
    });
  });

  describe('Modification Detection and Preservation', () => {
    it('should detect and preserve modified files during uninstall', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Modify a file
      const modePath = `${projectRoot}/.zcc/modes/pack-a-mode.md`;
      await fs.writeFile(modePath, '# Modified Pack A Mode\nUser customizations here');
      
      // Uninstall pack
      const result = await installer.uninstallPack('pack-a');
      
      expect(result.success).toBe(true);
      
      // Modified file should be preserved
      expect(await fs.exists(modePath)).toBe(true);
      const content = await fs.readFile(modePath, 'utf-8');
      expect(content).toContain('User customizations');
      
      // Non-modified files should be removed
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`)).toBe(false);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/helper.sh`)).toBe(false);
      
      // Verify modification was tracked
      const fileInfo = await registry.getFileInfo(modePath);
      expect(fileInfo?.modified).toBe(true);
    });

    it('should track multiple modifications across packs', async () => {
      const packA = createTestPack('pack-a');
      const packC = createTestPack('pack-c');
      
      // Install both packs
      await installer.installPack(packA, packSource);
      await installer.installPack(packC, packSource);
      
      // Modify files from both packs
      await fs.writeFile(`${projectRoot}/.zcc/modes/pack-a-mode.md`, 'Modified A');
      await fs.writeFile(`${projectRoot}/.zcc/modes/pack-c-mode.md`, 'Modified C');
      
      // Check modifications
      const modifications = await registry.detectModifications();
      
      expect(modifications).toHaveLength(2);
      expect(modifications).toContain(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      expect(modifications).toContain(`${projectRoot}/.zcc/modes/pack-c-mode.md`);
      
      // Get statistics
      const stats = await registry.getStats();
      expect(stats.modifiedFiles).toBe(2);
      expect(stats.totalPacks).toBe(2);
    });

    it('should handle missing files as modified', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Delete a file manually
      await fs.unlink(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      
      // Check if detected as modified
      const isModified = await registry.isFileModified(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      expect(isModified).toBe(true);
      
      // Uninstall should handle gracefully
      const result = await installer.uninstallPack('pack-a');
      expect(result.success).toBe(true);
    });
  });

  describe('Registry Persistence and Recovery', () => {
    it('should persist registry across installer instances', async () => {
      const packA = createTestPack('pack-a');
      
      // Install with first installer
      await installer.installPack(packA, packSource);
      
      // Create new instances
      const newRegistry = new FileRegistry(projectRoot, fs);
      
      // Load persisted data
      const data = await newRegistry.load();
      expect(data.packs['pack-a']).toBeDefined();
      expect(Object.keys(data.files)).toHaveLength(3);
      
      // Should detect pack is already installed
      const fileInfo = await newRegistry.getFileInfo(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      expect(fileInfo?.pack).toBe('pack-a');
    });

    it('should recover from corrupted registry', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Corrupt the registry
      await fs.writeFile(`${projectRoot}/.zcc/file-registry.json`, 'invalid json{');
      
      // Create new registry instance
      const newRegistry = new FileRegistry(projectRoot, fs);
      const data = await newRegistry.load();
      
      // Should reset to empty state
      expect(data.version).toBe('1.0.0');
      expect(data.files).toEqual({});
      expect(data.packs).toEqual({});
    });

    it('should restore from backup if available', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Create backup
      const registryPath = `${projectRoot}/.zcc/file-registry.json`;
      const content = await fs.readFile(registryPath, 'utf-8');
      await fs.writeFile(`${registryPath}.backup`, content);
      
      // Corrupt main registry
      await fs.writeFile(registryPath, 'corrupted');
      
      // Create new registry
      const newRegistry = new FileRegistry(projectRoot, fs);
      const data = await newRegistry.load();
      
      // Should restore from backup
      expect(data.packs['pack-a']).toBeDefined();
      expect(Object.keys(data.files)).toHaveLength(3);
    });

    it('should rebuild registry from packs.json if needed', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Delete registry files
      await fs.unlink(`${projectRoot}/.zcc/file-registry.json`);
      
      // Create new registry and rebuild
      const newRegistry = new FileRegistry(projectRoot, fs);
      await newRegistry.rebuild();
      
      const data = await newRegistry.load();
      expect(data.packs['pack-a']).toBeDefined();
      expect(data.packs['pack-a'].version).toBe('1.0.0');
    });
  });

  describe('Clean Switching Between Packs', () => {
    it('should cleanly switch from one pack to another', async () => {
      const packA = createTestPack('pack-a');
      const packC = createTestPack('pack-c');
      
      // Install Pack A
      const installA = await installer.installPack(packA, packSource);
      expect(installA.success).toBe(true);
      
      // Verify Pack A files exist
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/helper.sh`)).toBe(true);
      
      // Uninstall Pack A
      const uninstallA = await installer.uninstallPack('pack-a');
      expect(uninstallA.success).toBe(true);
      
      // Verify Pack A files are removed
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(false);
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`)).toBe(false);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/helper.sh`)).toBe(false);
      
      // Verify registry is clean
      const packAFiles = await registry.getPackFiles('pack-a');
      expect(packAFiles).toHaveLength(0);
      
      // Install Pack C
      const installC = await installer.installPack(packC, packSource);
      expect(installC.success).toBe(true);
      
      // Verify Pack C files exist
      expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-c-mode.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/pack-c-workflow.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/scripts/unique-script.sh`)).toBe(true);
      
      // Verify no artifacts from Pack A remain
      const registryData = await registry.load();
      expect(registryData.packs['pack-a']).toBeUndefined();
      expect(registryData.packs['pack-c']).toBeDefined();
      
      // Check no files are owned by Pack A
      const allFiles = Object.values(registryData.files);
      const packAOwned = allFiles.filter(f => f.pack === 'pack-a');
      expect(packAOwned).toHaveLength(0);
    });

    it('should handle rapid pack switching without conflicts', async () => {
      const packA = createTestPack('pack-a');
      const packC = createTestPack('pack-c');
      
      // Rapidly switch between packs
      for (let i = 0; i < 3; i++) {
        // Install A
        await installer.installPack(packA, packSource, { force: true });
        expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(true);
        
        // Uninstall A
        await installer.uninstallPack('pack-a');
        expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-a-mode.md`)).toBe(false);
        
        // Install C
        await installer.installPack(packC, packSource, { force: true });
        expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-c-mode.md`)).toBe(true);
        
        // Uninstall C
        await installer.uninstallPack('pack-c');
        expect(await fs.exists(`${projectRoot}/.zcc/modes/pack-c-mode.md`)).toBe(false);
      }
      
      // Verify clean state
      const stats = await registry.getStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalPacks).toBe(0);
      expect(stats.modifiedFiles).toBe(0);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle partial installation failure', async () => {
      const packA = createTestPack('pack-a');
      
      // Mock writeFile to fail on second file
      let callCount = 0;
      const originalWriteFile = fs.writeFile.bind(fs);
      fs.writeFile = jest.fn().mockImplementation(async (path: string, content: any, options?: any) => {
        if (path.includes('.zcc/workflows') && ++callCount === 1) {
          throw new Error('Write failed');
        }
        return originalWriteFile(path, content, options);
      });
      
      const result = await installer.installPack(packA, packSource);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Write failed'))).toBe(true);
      
      // Registry should still track successfully installed files
      const modeInfo = await registry.getFileInfo(`${projectRoot}/.zcc/modes/pack-a-mode.md`);
      expect(modeInfo).toBeDefined();
      
      // Restore mock
      fs.writeFile = originalWriteFile;
    });

    it('should handle concurrent modification detection', async () => {
      const packA = createTestPack('pack-a');
      
      // Install pack
      await installer.installPack(packA, packSource);
      
      // Simulate concurrent modifications
      const promises = [
        fs.writeFile(`${projectRoot}/.zcc/modes/pack-a-mode.md`, 'Modification 1'),
        registry.isFileModified(`${projectRoot}/.zcc/modes/pack-a-mode.md`),
        fs.writeFile(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`, 'Modification 2'),
        registry.isFileModified(`${projectRoot}/.zcc/workflows/pack-a-workflow.md`),
      ];
      
      await Promise.all(promises);
      
      // Both files should be marked as modified
      const modifications = await registry.detectModifications();
      expect(modifications).toHaveLength(2);
    });

    it('should handle checksum calculation for large files', async () => {
      const largePack = createTestPack('large-pack');
      
      // Create a large file content (1MB)
      const largeContent = 'x'.repeat(1024 * 1024);
      await fs.writeFile('/packs/large-pack/modes/large-pack-mode.md', largeContent);
      
      const result = await installer.installPack(largePack, packSource);
      
      expect(result.success).toBe(true);
      
      // Verify checksum was calculated
      const fileInfo = await registry.getFileInfo(`${projectRoot}/.zcc/modes/large-pack-mode.md`);
      expect(fileInfo?.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should handle special characters in file paths', async () => {
      const specialPack: PackStructure = {
        manifest: {
          name: 'special-pack',
          version: '1.0.0',
          description: 'Pack with special chars',
          author: 'test',
          components: {
            modes: [{ name: 'mode-with-dash', required: true }],
            workflows: [{ name: 'workflow_with_underscore', required: true }],
          },
          tags: ['test'],
          category: 'general'
        },
        path: '/packs/special-pack'
      };
      
      await fs.writeFile('/packs/special-pack/manifest.json', JSON.stringify(specialPack.manifest));
      await fs.writeFile('/packs/special-pack/modes/mode-with-dash.md', 'Content');
      await fs.writeFile('/packs/special-pack/workflows/workflow_with_underscore.md', 'Content');
      
      const result = await installer.installPack(specialPack, packSource);
      
      expect(result.success).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/modes/mode-with-dash.md`)).toBe(true);
      expect(await fs.exists(`${projectRoot}/.zcc/workflows/workflow_with_underscore.md`)).toBe(true);
    });
  });
});