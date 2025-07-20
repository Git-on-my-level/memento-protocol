import * as fs from "fs";
import * as path from "path";
import { PackagePaths } from "../packagePaths";

describe("Template Metadata", () => {
  it("should have metadata for every template file", () => {
    const templatesDir = PackagePaths.getTemplatesDir();
    const metadataPath = path.join(templatesDir, "metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

    const modesDir = path.join(templatesDir, "modes");
    const workflowsDir = path.join(templatesDir, "workflows");

    const modeFiles = fs
      .readdirSync(modesDir)
      .map((file) => path.parse(file).name);
    const workflowFiles = fs
      .readdirSync(workflowsDir)
      .map((file) => path.parse(file).name);

    const metadataModes = metadata.templates.modes.map((m: any) => m.name);
    const metadataWorkflows = metadata.templates.workflows.map(
      (w: any) => w.name
    );

    expect(modeFiles.sort()).toEqual(metadataModes.sort());
    expect(workflowFiles.sort()).toEqual(metadataWorkflows.sort());
  });
});
