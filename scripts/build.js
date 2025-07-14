const esbuild = require('esbuild');
const { execSync } = require('child_process');

// Clean dist directory
execSync('rm -rf dist', { stdio: 'inherit' });

// Build CLI
esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: 'dist/cli.js',
  external: ['esbuild'], // Don't bundle esbuild itself
  minify: false,
  sourcemap: true,
}).then(() => {
  // Add shebang to the built file
  const fs = require('fs');
  const content = fs.readFileSync('dist/cli.js', 'utf8');
  fs.writeFileSync('dist/cli.js', '#!/usr/bin/env node\n' + content);
  
  // Copy templates to dist directory
  execSync('cp -r templates dist/', { stdio: 'inherit' });
  
  console.log('Build completed successfully');
  // Make the CLI executable
  execSync('chmod +x dist/cli.js', { stdio: 'inherit' });
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});