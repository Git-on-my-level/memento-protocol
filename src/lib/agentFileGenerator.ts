import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import { ConfigManager } from "./configManager";
import { ComponentInstaller } from "./componentInstaller";
import { TemplateLocator } from "./templateLocator";

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  targetFilename: string;
  templatePath: string;
  placeholders: Record<string, string>;
}

export interface PlaceholderValues {
  PROJECT_NAME?: string;
  PROJECT_DESCRIPTION?: string;
  TECH_STACK?: string;
  PROJECT_STRUCTURE?: string;
  LANGUAGE_GUIDELINES?: string;
  NAMING_CONVENTIONS?: string;
  FRAMEWORK_GUIDELINES?: string;
  COMPONENT_STRUCTURE?: string;
  STATE_MANAGEMENT?: string;
  API_DESIGN?: string;
  MEMENTO_INSTRUCTIONS?: string;
  ADDITIONAL_CONTEXT?: string;
  DEFAULT_MODE?: string;
  MODES_LIST?: string;
  WORKFLOWS_LIST?: string;
  PROJECT_SPECIFIC_INSTRUCTIONS?: string;
  PROJECT_GOALS?: string;
  ARCHITECTURE_OVERVIEW?: string;
  PRIMARY_LANGUAGE?: string;
  LANGUAGE_SPECIFIC_GUIDELINES?: string;
  CODE_ORGANIZATION?: string;
  DEPENDENCY_GUIDELINES?: string;
  BUILD_DEPLOYMENT_GUIDELINES?: string;
  TEST_STRATEGY?: string;
  TEST_STRUCTURE_EXAMPLE?: string;
  FORMATTING_RULES?: string;
  DOCUMENTATION_GUIDELINES?: string;
  ERROR_HANDLING_GUIDELINES?: string;
  LOGGING_GUIDELINES?: string;
  MEMENTO_USAGE_GUIDELINES?: string;
  FILE_NAMING_CONVENTIONS?: string;
  API_CONVENTIONS?: string;
  DATABASE_CONVENTIONS?: string;
  SECURITY_GUIDELINES?: string;
  [key: string]: string | undefined;
}

export class AgentFileGenerator {
  private projectRoot: string;
  private configManager: ConfigManager;
  private componentInstaller: ComponentInstaller;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configManager = new ConfigManager(projectRoot);
    this.componentInstaller = new ComponentInstaller(projectRoot);
  }

  /**
   * Generate agent file from template
   */
  async generate(
    agentConfig: AgentConfig,
    placeholderValues: PlaceholderValues,
    existingContent?: string
  ): Promise<void> {
    // Load template content
    const templateContent = await this.loadTemplate(agentConfig.templatePath);
    if (!templateContent) {
      throw new Error(
        `Agent template not found: ${agentConfig.templatePath}`
      );
    }

    // Replace placeholders
    let processedContent = await this.replacePlaceholders(
      templateContent,
      placeholderValues,
      agentConfig
    );

    // Merge with existing content if applicable
    const finalContent = existingContent
      ? this.mergeWithExisting(
          processedContent,
          existingContent,
          agentConfig.id
        )
      : processedContent;

    // Write file
    const targetPath = path.join(this.projectRoot, agentConfig.targetFilename);
    await fs.writeFile(targetPath, finalContent, "utf-8");
    logger.success(`Generated ${agentConfig.targetFilename} for ${agentConfig.name}`);
  }

  /**
   * Check if agent file already exists
   */
  async exists(targetFilename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.projectRoot, targetFilename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read existing agent file content
   */
  async readExisting(targetFilename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.projectRoot, targetFilename);
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Replace placeholders in template content
   */
  private async replacePlaceholders(
    content: string,
    values: PlaceholderValues,
    agentConfig: AgentConfig
  ): Promise<string> {
    let processedContent = content;

    // Handle special placeholders that need dynamic generation
    if (agentConfig.id === "claude") {
      processedContent = await this.injectClaudeSpecificContent(
        processedContent,
        values
      );
    }

    // Replace all provided placeholders
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(
          new RegExp(placeholder, "g"),
          value
        );
      }
    }

    // Replace any remaining placeholders with empty strings
    processedContent = processedContent.replace(/\{\{[^}]+\}\}/g, "");

    return processedContent;
  }

  /**
   * Inject Claude-specific dynamic content
   */
  private async injectClaudeSpecificContent(
    content: string,
    values: PlaceholderValues
  ): Promise<string> {
    let processedContent = content;

    // Generate modes list if not provided
    if (!values.MODES_LIST && content.includes("{{MODES_LIST}}")) {
      const modesList = await this.generateModesList();
      processedContent = processedContent.replace(
        "{{MODES_LIST}}",
        modesList
      );
    }

    // Generate workflows list if not provided
    if (!values.WORKFLOWS_LIST && content.includes("{{WORKFLOWS_LIST}}")) {
      const workflowsList = await this.generateWorkflowsList();
      processedContent = processedContent.replace(
        "{{WORKFLOWS_LIST}}",
        workflowsList
      );
    }

    // Set default mode if not provided
    if (!values.DEFAULT_MODE && content.includes("{{DEFAULT_MODE}}")) {
      const defaultMode = await this.getDefaultMode();
      processedContent = processedContent.replace(
        "{{DEFAULT_MODE}}",
        defaultMode || "autonomous-project-manager"
      );
    }

    return processedContent;
  }

  /**
   * Generate formatted list of available modes
   */
  private async generateModesList(): Promise<string> {
    try {
      const modesDir = path.join(this.projectRoot, ".memento", "modes");
      const files = await fs.readdir(modesDir);
      const modes = files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));

      if (modes.length === 0) {
        return "- No modes installed yet";
      }

      // Try to get descriptions from component metadata
      const availableComponents = await this.componentInstaller.listAvailableComponents();
      const modeDescriptions = availableComponents.modes.reduce(
        (acc: Record<string, string>, mode: any) => {
          acc[mode.name] = mode.description;
          return acc;
        },
        {}
      );

      return modes
        .map((mode) => {
          const description = modeDescriptions[mode] || "Custom mode";
          return `- \`${mode}\` - ${description}`;
        })
        .join("\n");
    } catch {
      return "- No modes installed yet";
    }
  }

  /**
   * Generate formatted list of available workflows
   */
  private async generateWorkflowsList(): Promise<string> {
    try {
      const workflowsDir = path.join(this.projectRoot, ".memento", "workflows");
      const files = await fs.readdir(workflowsDir);
      const workflows = files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));

      if (workflows.length === 0) {
        return "- No workflows installed yet";
      }

      // Try to get descriptions from component metadata
      const availableComponents = await this.componentInstaller.listAvailableComponents();
      const workflowDescriptions = availableComponents.workflows.reduce(
        (acc: Record<string, string>, workflow: any) => {
          acc[workflow.name] = workflow.description;
          return acc;
        },
        {}
      );

      return workflows
        .map((workflow) => {
          const description = workflowDescriptions[workflow] || "Custom workflow";
          return `- \`execute ${workflow}\` - ${description}`;
        })
        .join("\n");
    } catch {
      return "- No workflows installed yet";
    }
  }

  /**
   * Get default mode from config
   */
  private async getDefaultMode(): Promise<string | undefined> {
    try {
      return await this.configManager.get("defaultMode");
    } catch {
      return undefined;
    }
  }

  /**
   * Merge template content with existing file
   */
  private mergeWithExisting(
    templateContent: string,
    existingContent: string,
    agentId: string
  ): string {
    // Different merge strategies based on agent type
    if (agentId === "claude") {
      return this.mergeClaudeContent(templateContent, existingContent);
    } else if (agentId === "cursor") {
      return this.mergeCursorContent(templateContent, existingContent);
    } else if (agentId === "gemini") {
      return this.mergeGeminiContent(templateContent, existingContent);
    }

    // Default: replace entirely
    return templateContent;
  }

  /**
   * Merge Claude content preserving project-specific instructions
   */
  private mergeClaudeContent(
    templateContent: string,
    existingContent: string
  ): string {
    // Check if existing content already has Memento Protocol section
    if (existingContent.includes("Memento Protocol Router")) {
      // Update the router section while preserving project-specific content
      const projectSpecificMarker =
        "<!-- Project-specific content below this line -->";
      const markerIndex = existingContent.indexOf(projectSpecificMarker);

      if (markerIndex !== -1) {
        // Preserve everything after the marker
        const projectContent = existingContent.substring(
          markerIndex + projectSpecificMarker.length
        );
        return templateContent + projectContent;
      }
    }

    // If no Memento section exists, append router to existing content
    return templateContent + "\n\n" + existingContent;
  }

  /**
   * Merge Cursor content (simple replacement for now)
   */
  private mergeCursorContent(
    templateContent: string,
    _existingContent: string
  ): string {
    // For .cursorrules, we'll replace entirely as it's meant to be a complete ruleset
    // In future, could implement section-based merging
    return templateContent;
  }

  /**
   * Merge Gemini content (simple replacement for now)
   */
  private mergeGeminiContent(
    templateContent: string,
    _existingContent: string
  ): string {
    // For GEMINI.md, we'll replace entirely
    // In future, could implement section-based merging
    return templateContent;
  }

  /**
   * Load template from file
   */
  private async loadTemplate(templatePath: string): Promise<string | null> {
    try {
      // templatePath is already absolute from loadAgentMetadata
      const content = await fs.readFile(templatePath, "utf-8");
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Load agent metadata
   */
  static async loadAgentMetadata(_projectRoot: string): Promise<Record<string, AgentConfig>> {
    const metadataPath = TemplateLocator.getTemplatePath("agents", "metadata.json");
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);
      
      const agents: Record<string, AgentConfig> = {};
      for (const [id, template] of Object.entries(metadata.templates) as any) {
        agents[id] = {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          description: template.description,
          targetFilename: template.targetFilename,
          templatePath: TemplateLocator.getTemplatePath("agents", template.filename),
          placeholders: template.placeholders || {}
        };
      }
      
      return agents;
    } catch (error) {
      logger.error("Failed to load agent metadata:", error);
      return {};
    }
  }
}