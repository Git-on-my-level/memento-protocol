import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

/**
 * Creates a fresh in-memory filesystem for testing.
 * 
 * This function provides a simple way to create isolated test filesystems
 * that don't touch the real filesystem and are automatically cleaned up.
 * 
 * @param initialFiles Optional object mapping file paths to their content
 * @returns A MemoryFileSystemAdapter instance
 * 
 * @example
 * ```typescript
 * // Empty filesystem
 * const fs = await createTestFileSystem();
 * 
 * // Pre-populated filesystem
 * const fs = await createTestFileSystem({
 *   '/project/.memento/config.json': JSON.stringify({ theme: 'dark' }),
 *   '/project/src/index.ts': 'console.log("Hello, World!");',
 *   '/project/README.md': '# My Project\n\nThis is a test project.'
 * });
 * 
 * // Use like any filesystem
 * await fs.writeFile('/new-file.txt', 'New content');
 * const content = await fs.readFile('/project/README.md', 'utf8');
 * ```
 */
export async function createTestFileSystem(
  initialFiles: Record<string, string> = {}
): Promise<MemoryFileSystemAdapter> {
  const fsAdapter = new MemoryFileSystemAdapter(initialFiles);
  return fsAdapter;
}

/**
 * Creates a test filesystem with a typical Memento Protocol project structure.
 * 
 * This is a convenience function that creates a filesystem pre-populated with
 * a standard Memento project layout, making it easier to test project-specific
 * functionality.
 * 
 * @param projectRoot The root directory path for the project (default: '/project')
 * @param customFiles Additional files to add to the filesystem
 * @returns A MemoryFileSystemAdapter with a typical project structure
 * 
 * @example
 * ```typescript
 * const fs = await createTestMementoProject('/my-project', {
 *   '/my-project/package.json': JSON.stringify({ name: 'test-project' })
 * });
 * 
 * // The filesystem now contains:
 * // /my-project/.memento/
 * // /my-project/.memento/config.json
 * // /my-project/.memento/modes/
 * // /my-project/.memento/workflows/
 * // /my-project/.memento/tickets/
 * // /my-project/.claude/
 * // Plus any custom files you specified
 * ```
 */
export async function createTestMementoProject(
  projectRoot: string = '/project',
  customFiles: Record<string, string> = {}
): Promise<MemoryFileSystemAdapter> {
  const defaultConfig = {
    version: '1.0.0',
    theme: 'default',
    enableHooks: true,
    ticketSystem: {
      autoMove: true,
      requireDescription: false
    }
  };

  const defaultFiles: Record<string, string> = {
    // Memento directories and config
    [`${projectRoot}/.memento/config.json`]: JSON.stringify(defaultConfig, null, 2),
    [`${projectRoot}/.memento/modes/.gitkeep`]: '',
    [`${projectRoot}/.memento/workflows/.gitkeep`]: '',
    [`${projectRoot}/.memento/tickets/next/.gitkeep`]: '',
    [`${projectRoot}/.memento/tickets/in-progress/.gitkeep`]: '',
    [`${projectRoot}/.memento/tickets/done/.gitkeep`]: '',
    
    // Claude Code directories
    [`${projectRoot}/.claude/agents/.gitkeep`]: '',
    [`${projectRoot}/.claude/commands/.gitkeep`]: '',
    
    // Basic project files
    [`${projectRoot}/package.json`]: JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'A test project for Memento Protocol testing'
    }, null, 2),
    [`${projectRoot}/README.md`]: '# Test Project\n\nThis is a test project created for testing Memento Protocol functionality.'
  };

  // Merge default files with custom files (custom files override defaults)
  const allFiles = { ...defaultFiles, ...customFiles };
  
  return await createTestFileSystem(allFiles);
}

/**
 * Creates multiple isolated test filesystems for testing interactions between projects.
 * 
 * This is useful for testing scenarios involving multiple projects, global configurations,
 * or cross-project functionality.
 * 
 * @param projects Object mapping project names to their file structures
 * @returns A MemoryFileSystemAdapter containing all projects
 * 
 * @example
 * ```typescript
 * const fs = await createMultiProjectTestFileSystem({
 *   'frontend': {
 *     '/frontend/package.json': JSON.stringify({ name: 'frontend' }),
 *     '/frontend/.memento/config.json': JSON.stringify({ theme: 'react' })
 *   },
 *   'backend': {
 *     '/backend/package.json': JSON.stringify({ name: 'backend' }),
 *     '/backend/.memento/config.json': JSON.stringify({ theme: 'node' })
 *   }
 * });
 * ```
 */
export async function createMultiProjectTestFileSystem(
  projects: Record<string, Record<string, string>>
): Promise<MemoryFileSystemAdapter> {
  const allFiles: Record<string, string> = {};
  
  // Flatten all project files into a single filesystem
  Object.values(projects).forEach(projectFiles => {
    Object.assign(allFiles, projectFiles);
  });
  
  return await createTestFileSystem(allFiles);
}