export class FuzzyMatcher {
  private patterns: string[];
  private confidence: number;

  constructor(pattern: string, confidence: number = 0.7) {
    this.patterns = pattern.split('|').map(p => p.trim().toLowerCase());
    this.confidence = confidence;
  }

  matches(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    for (const pattern of this.patterns) {
      if (this.fuzzyMatch(lowerText, pattern) >= this.confidence) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate fuzzy match score between text and pattern
   * Returns a score between 0 and 1
   */
  private fuzzyMatch(text: string, pattern: string): number {
    // Check for exact substring match first
    if (text.includes(pattern)) {
      return 1.0;
    }

    // Split into words and check word-level matches
    const textWords = text.split(/\s+/);
    const patternWords = pattern.split(/\s+/);
    
    let matchedWords = 0;
    for (const patternWord of patternWords) {
      for (const textWord of textWords) {
        if (textWord.includes(patternWord) || patternWord.includes(textWord)) {
          matchedWords++;
          break;
        }
        // Check Levenshtein distance for close matches
        if (this.levenshteinDistance(textWord, patternWord) <= 2) {
          matchedWords += 0.8;
          break;
        }
      }
    }
    
    return matchedWords / patternWords.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}