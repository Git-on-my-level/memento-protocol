const esbuild = require("esbuild");
const { execSync } = require("child_process");
const fs = require("fs");
const { generateMetadata } = require("./generate-metadata");

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;

console.log(`Building version ${version}...`);

// Generate metadata.json from templates
console.log("Generating metadata...");
generateMetadata();

// Clean dist directory
execSync("rm -rf dist", { stdio: "inherit" });

// Build CLI
esbuild
  .build({
    entryPoints: ["src/cli.ts"],
    bundle: true,
    platform: "node",
    target: "node16",
    outfile: "dist/cli.js",
    external: ["esbuild"], // Don't bundle esbuild itself
    minify: false,
    sourcemap: true,
    define: {
      "process.env.VERSION": JSON.stringify(version),
    },
  })
  .then(() => {
    // Add shebang to the built file
    const content = fs.readFileSync("dist/cli.js", "utf8");
    fs.writeFileSync("dist/cli.js", "#!/usr/bin/env node\n" + content);

    // Copy templates to dist directory
    execSync("cp -r templates dist/", { stdio: "inherit" });

    console.log("Build completed successfully");
    // Make the CLI executable
    execSync("chmod +x dist/cli.js", { stdio: "inherit" });

    // Verify the shebang was added correctly
    const finalContent = fs.readFileSync("dist/cli.js", "utf8");
    if (!finalContent.startsWith("#!/usr/bin/env node")) {
      throw new Error("Shebang was not added correctly to cli.js");
    }
    console.log("✓ Shebang verified in cli.js");
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
