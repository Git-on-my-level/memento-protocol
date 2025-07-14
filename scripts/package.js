const esbuild = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Output directory for packaged executables
const outDir = 'dist/packaged';
execSync(`mkdir -p ${outDir}`, { stdio: 'inherit' });

// Copy templates to a temporary location for bundling
const tempDir = 'dist/temp';
execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });
execSync(`mkdir -p ${tempDir}`, { stdio: 'inherit' });
execSync(`cp -r templates ${tempDir}/`, { stdio: 'inherit' });

// Create a loader file to bundle templates
const loaderContent = `
const templates = ${JSON.stringify(readTemplatesSync('templates'))};

function readTemplatesSync(dir) {
  const fs = require('fs');
  const path = require('path');
  const result = {};
  
  function readDir(currentDir, currentResult) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        currentResult[item] = {};
        readDir(fullPath, currentResult[item]);
      } else if (stat.isFile()) {
        currentResult[item] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }
  
  readDir(dir, result);
  return result;
}

// Override fs.readFileSync for templates
const originalReadFileSync = require('fs').readFileSync;
require('fs').readFileSync = function(path, encoding) {
  if (typeof path === 'string' && path.includes('templates/')) {
    const relativePath = path.split('templates/')[1];
    const parts = relativePath.split('/');
    let current = templates;
    for (const part of parts) {
      current = current[part];
      if (!current) break;
    }
    if (current && typeof current === 'string') {
      return current;
    }
  }
  return originalReadFileSync.apply(this, arguments);
};

// Also override existsSync for templates
const originalExistsSync = require('fs').existsSync;
require('fs').existsSync = function(path) {
  if (typeof path === 'string' && path.includes('templates/')) {
    const relativePath = path.split('templates/')[1];
    const parts = relativePath.split('/');
    let current = templates;
    for (const part of parts) {
      current = current[part];
      if (!current) return false;
    }
    return true;
  }
  return originalExistsSync.apply(this, arguments);
};
`;

fs.writeFileSync(`${tempDir}/template-loader.js`, loaderContent);

// Build standalone executable with templates bundled
esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: `${outDir}/memento-${version}.js`,
  external: [], // Bundle everything for standalone
  banner: {
    js: `#!/usr/bin/env node\n${loaderContent}`
  },
  minify: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"',
    '__VERSION__': `"${version}"`
  }
}).then(() => {
  // Make executable
  execSync(`chmod +x ${outDir}/memento-${version}.js`, { stdio: 'inherit' });
  
  // Create platform-specific builds
  const platforms = [
    { name: 'darwin', displayName: 'macOS' },
    { name: 'linux', displayName: 'Linux' }
  ];
  
  for (const platform of platforms) {
    const platformFile = `${outDir}/memento-${version}-${platform.name}`;
    execSync(`cp ${outDir}/memento-${version}.js ${platformFile}`, { stdio: 'inherit' });
    execSync(`chmod +x ${platformFile}`, { stdio: 'inherit' });
  }
  
  // Clean up temp directory
  execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });
  
  console.log(`✓ Created standalone executables:`);
  console.log(`  - Universal: ${outDir}/memento-${version}.js`);
  console.log(`  - macOS: ${outDir}/memento-${version}-darwin`);
  console.log(`  - Linux: ${outDir}/memento-${version}-linux`);
  console.log(`  Size: ${(fs.statSync(`${outDir}/memento-${version}.js`).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('');
  console.log('To use:');
  console.log(`  ./dist/packaged/memento-${version}.js --help`);
  console.log('');
  console.log('To install globally:');
  console.log(`  sudo cp dist/packaged/memento-${version}-$(uname -s | tr '[:upper:]' '[:lower:]') /usr/local/bin/memento`);
}).catch((error) => {
  console.error('Packaging failed:', error);
  process.exit(1);
});

function readTemplatesSync(dir) {
  const result = {};
  
  function readDir(currentDir, currentResult) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        currentResult[item] = {};
        readDir(fullPath, currentResult[item]);
      } else if (stat.isFile()) {
        currentResult[item] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }
  
  readDir(dir, result);
  return result;
}