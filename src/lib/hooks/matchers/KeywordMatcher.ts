export class KeywordMatcher {
  private keywords: string[];
  private requiredKeywords: string[];
  private optionalKeywords: string[];
  private excludedKeywords: string[];

  constructor(pattern: string) {
    this.keywords = [];
    this.requiredKeywords = [];
    this.optionalKeywords = [];
    this.excludedKeywords = [];
    
    this.parsePattern(pattern);
  }

  private parsePattern(pattern: string): void {
    const parts = pattern.split(/\s+/);
    
    for (const part of parts) {
      if (part.startsWith('+')) {
        // Required keyword
        this.requiredKeywords.push(part.substring(1).toLowerCase());
      } else if (part.startsWith('-')) {
        // Excluded keyword
        this.excludedKeywords.push(part.substring(1).toLowerCase());
      } else if (part.startsWith('?')) {
        // Optional keyword
        this.optionalKeywords.push(part.substring(1).toLowerCase());
      } else {
        // Regular keyword (at least one must match)
        this.keywords.push(part.toLowerCase());
      }
    }
  }

  matches(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check excluded keywords first
    for (const excluded of this.excludedKeywords) {
      if (lowerText.includes(excluded)) {
        return false;
      }
    }
    
    // Check required keywords
    for (const required of this.requiredKeywords) {
      if (!lowerText.includes(required)) {
        return false;
      }
    }
    
    // If we have regular keywords, at least one must match
    if (this.keywords.length > 0) {
      let hasMatch = false;
      for (const keyword of this.keywords) {
        if (lowerText.includes(keyword)) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) {
        return false;
      }
    }
    
    // Optional keywords don't affect the result
    return true;
  }
}