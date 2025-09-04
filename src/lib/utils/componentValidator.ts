import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  line?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * Basic component validation - checks YAML frontmatter and required fields
 * This is a simplified version that focuses on essential validation without being intrusive
 */
export function validateComponent(filePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for YAML frontmatter
    if (!content.startsWith('---\n')) {
      issues.push({
        type: 'error',
        message: 'Missing YAML frontmatter at the beginning of the file',
        line: 1
      });
      return { isValid: false, issues };
    }
    
    const frontmatterEnd = content.indexOf('\n---\n', 4);
    if (frontmatterEnd === -1) {
      issues.push({
        type: 'error',
        message: 'Malformed YAML frontmatter - missing closing "---"',
        line: 2
      });
      return { isValid: false, issues };
    }
    
    const frontmatterContent = content.substring(4, frontmatterEnd);
    let frontmatterData: any;
    
    // Parse YAML frontmatter
    try {
      frontmatterData = yaml.load(frontmatterContent);
    } catch (error: any) {
      issues.push({
        type: 'error',
        message: `Invalid YAML frontmatter: ${error.message}`,
        line: 2
      });
      return { isValid: false, issues };
    }
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'author', 'version'];
    for (const field of requiredFields) {
      if (!frontmatterData || !frontmatterData[field]) {
        issues.push({
          type: 'error',
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Check for basic field validation
    if (frontmatterData) {
      if (frontmatterData.name && typeof frontmatterData.name !== 'string') {
        issues.push({
          type: 'error',
          message: 'Field "name" must be a string'
        });
      }
      
      if (frontmatterData.name && !/^[a-z0-9-_]+$/.test(frontmatterData.name)) {
        issues.push({
          type: 'error',
          message: 'Field "name" must contain only lowercase letters, numbers, hyphens, and underscores'
        });
      }
      
      // Warning for short description
      if (frontmatterData.description && frontmatterData.description.length < 10) {
        issues.push({
          type: 'warning',
          message: 'Description should be more descriptive (at least 10 characters)'
        });
      }
    }
    
    const bodyContent = content.substring(frontmatterEnd + 5);
    
    // Check for minimum content (warning only)
    if (bodyContent.trim().length < 50) {
      issues.push({
        type: 'warning',
        message: 'Component content seems very short - consider adding more details'
      });
    }
    
  } catch (error: any) {
    issues.push({
      type: 'error',
      message: `Failed to read or parse file: ${error.message}`
    });
  }
  
  // Component is valid if there are no errors (warnings don't make it invalid)
  const hasErrors = issues.some(issue => issue.type === 'error');
  
  return {
    isValid: !hasErrors,
    issues
  };
}

/**
 * Format validation issues for display
 */
export function formatValidationIssues(issues: ValidationIssue[]): string[] {
  return issues.map(issue => {
    const prefix = issue.type === 'error' ? '✗' : '⚠';
    const lineInfo = issue.line ? ` (line ${issue.line})` : '';
    return `${prefix} ${issue.message}${lineInfo}`;
  });
}