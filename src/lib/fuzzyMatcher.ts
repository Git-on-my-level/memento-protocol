import { ComponentInfo } from './ZccScope';
import { isNonInteractive } from './context';

export interface FuzzyMatch {
  name: string;
  score: number; // 0-100, higher is better
  source: 'builtin' | 'global' | 'project';
  component: ComponentInfo;
  matchType: 'exact' | 'substring' | 'acronym' | 'partial';
}

export interface FuzzyMatchOptions {
  maxResults?: number;
  minScore?: number;
  caseSensitive?: boolean;
  includeMetadata?: boolean;
  autoSelectBest?: boolean; // Automatically return best match in non-interactive mode
}

/**
 * Advanced fuzzy matching system for component names
 * Supports exact matches, substring matches, acronym matching, and partial matching
 */
export class FuzzyMatcher {
  private static readonly SCORES = {
    EXACT: 100,
    EXACT_CASE_INSENSITIVE: 95,
    START_WITH: 80,
    SUBSTRING: 60,
    ACRONYM: 70,
    PARTIAL_WORD: 50,
    PARTIAL_CHAR: 30,
  };

  /**
   * Find the best matches for a query among available components
   */
  static findMatches(
    query: string,
    components: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>,
    options: FuzzyMatchOptions = {}
  ): FuzzyMatch[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const {
      maxResults = 10,
      minScore = 20,
      caseSensitive = false,
      includeMetadata = true,
    } = options;

    const matches: FuzzyMatch[] = [];
    const normalizedQuery = caseSensitive ? query : query.toLowerCase();

    for (const { component, source } of components) {
      const componentName = caseSensitive ? component.name : component.name.toLowerCase();
      const score = this.calculateScore(normalizedQuery, componentName, component, includeMetadata);

      if (score >= minScore) {
        const matchType = this.determineMatchType(normalizedQuery, componentName);
        matches.push({
          name: component.name,
          score,
          source,
          component,
          matchType,
        });
      }
    }

    // Sort by score (descending), then by source precedence (project > global > builtin), then by name
    matches.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // Source precedence: project > global > builtin
      const sourceOrder = { project: 3, global: 2, builtin: 1 };
      if (sourceOrder[a.source] !== sourceOrder[b.source]) {
        return sourceOrder[b.source] - sourceOrder[a.source];
      }

      return a.name.localeCompare(b.name);
    });

    return matches.slice(0, maxResults);
  }

  /**
   * Find the single best match for a query
   */
  static findBestMatch(
    query: string,
    components: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>,
    options: FuzzyMatchOptions = {}
  ): FuzzyMatch | null {
    const matches = this.findMatches(query, components, { ...options, maxResults: 1 });
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Smart matching that considers interactive/non-interactive mode
   * In non-interactive mode: returns best match if score is good enough, empty array otherwise
   * In interactive mode: returns all matches for user selection
   */
  static findMatchesForMode(
    query: string,
    components: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>,
    options: FuzzyMatchOptions = {}
  ): FuzzyMatch[] {
    const isNonInteractiveMode = options.autoSelectBest ?? isNonInteractive();
    
    if (isNonInteractiveMode) {
      // In non-interactive mode, we want to auto-select if we have a good match
      const matches = this.findMatches(query, components, options);
      
      if (matches.length === 0) {
        return []; // No matches found
      }
      
      const bestMatch = matches[0];
      
      // Auto-select criteria:
      // 1. Exact match (score 100) - always select
      // 2. High confidence match (score >= 80) - select if unambiguous
      // 3. For lower scores, require exact match type to avoid confusion
      const shouldAutoSelect = 
        bestMatch.score >= 100 || // Exact match
        (bestMatch.score >= 80 && (matches.length === 1 || bestMatch.score > matches[1].score + 20)) || // High confidence, unambiguous
        (bestMatch.matchType === 'exact'); // Exact string match regardless of score
      
      if (shouldAutoSelect) {
        return [bestMatch]; // Return single best match for auto-selection
      } else {
        return []; // Ambiguous matches, require user intervention
      }
    } else {
      // Interactive mode - return all matches for user selection
      return this.findMatches(query, components, options);
    }
  }

  /**
   * Calculate the fuzzy match score for a query against a component name
   */
  private static calculateScore(
    query: string,
    componentName: string,
    component: ComponentInfo,
    includeMetadata: boolean
  ): number {
    // Exact match (highest priority)
    if (query === componentName) {
      return this.SCORES.EXACT;
    }

    let score = 0;

    // Check for various match types
    if (componentName.startsWith(query)) {
      score = Math.max(score, this.SCORES.START_WITH);
    } else if (componentName.includes(query)) {
      score = Math.max(score, this.SCORES.SUBSTRING);
    }

    // Acronym matching (e.g., 'apm' -> 'autonomous-project-manager')
    const acronymScore = this.calculateAcronymScore(query, componentName);
    score = Math.max(score, acronymScore);

    // Word boundary matching
    const wordScore = this.calculateWordScore(query, componentName);
    score = Math.max(score, wordScore);

    // Character-level partial matching
    const charScore = this.calculateCharacterScore(query, componentName);
    score = Math.max(score, charScore);

    // Boost score based on metadata if available and enabled
    if (includeMetadata && component.metadata) {
      const metadataBoost = this.calculateMetadataScore(query, component.metadata);
      score += metadataBoost;
    }

    return Math.min(score, this.SCORES.EXACT); // Cap at 100
  }

  /**
   * Calculate acronym matching score
   * e.g., 'apm' matches 'autonomous-project-manager'
   */
  private static calculateAcronymScore(query: string, componentName: string): number {
    const words = componentName.split(/[-_\s]+/).filter(word => word.length > 0);
    
    if (words.length < query.length) {
      return 0;
    }

    // Check if query matches the first letter of each word
    let matchCount = 0;
    for (let i = 0; i < Math.min(query.length, words.length); i++) {
      if (query[i] === words[i][0]) {
        matchCount++;
      } else {
        break; // Must be consecutive
      }
    }

    if (matchCount === query.length && matchCount > 1) {
      // Perfect acronym match, score based on how much of the component name is matched
      const coverage = matchCount / words.length;
      return Math.floor(this.SCORES.ACRONYM * coverage);
    }

    return 0;
  }

  /**
   * Calculate word boundary matching score
   */
  private static calculateWordScore(query: string, componentName: string): number {
    const words = componentName.split(/[-_\s]+/).filter(word => word.length > 0);
    let bestScore = 0;

    for (const word of words) {
      if (word.startsWith(query)) {
        const coverage = query.length / word.length;
        bestScore = Math.max(bestScore, Math.floor(this.SCORES.PARTIAL_WORD * coverage));
      } else if (word.includes(query)) {
        const coverage = query.length / word.length;
        bestScore = Math.max(bestScore, Math.floor(this.SCORES.PARTIAL_WORD * coverage * 0.7));
      }
    }

    return bestScore;
  }

  /**
   * Calculate character-level matching score using a simple algorithm
   */
  private static calculateCharacterScore(query: string, componentName: string): number {
    let matchCount = 0;
    let queryIndex = 0;

    for (let i = 0; i < componentName.length && queryIndex < query.length; i++) {
      if (componentName[i] === query[queryIndex]) {
        matchCount++;
        queryIndex++;
      }
    }

    if (queryIndex === query.length) {
      // All query characters found in order
      const coverage = matchCount / Math.max(query.length, componentName.length);
      return Math.floor(this.SCORES.PARTIAL_CHAR * coverage);
    }

    return 0;
  }

  /**
   * Calculate score boost based on metadata matching
   */
  private static calculateMetadataScore(query: string, metadata: any): number {
    if (!metadata || typeof metadata !== 'object') {
      return 0;
    }

    let boost = 0;

    // Check description
    if (metadata.description && typeof metadata.description === 'string') {
      const description = metadata.description.toLowerCase();
      if (description.includes(query)) {
        boost += 5;
      }
    }

    // Check tags
    if (Array.isArray(metadata.tags)) {
      for (const tag of metadata.tags) {
        if (typeof tag === 'string' && tag.toLowerCase().includes(query)) {
          boost += 3;
        }
      }
    }

    return Math.min(boost, 15); // Cap metadata boost at 15 points
  }

  /**
   * Determine the type of match that was found
   */
  private static determineMatchType(query: string, componentName: string): FuzzyMatch['matchType'] {
    if (query === componentName) {
      return 'exact';
    }

    if (componentName.includes(query)) {
      return 'substring';
    }

    // Check for acronym match
    const words = componentName.split(/[-_\s]+/).filter(word => word.length > 0);
    if (words.length >= query.length) {
      let isAcronym = true;
      for (let i = 0; i < query.length; i++) {
        if (!words[i] || query[i] !== words[i][0]) {
          isAcronym = false;
          break;
        }
      }
      if (isAcronym) {
        return 'acronym';
      }
    }

    return 'partial';
  }

  /**
   * Generate helpful suggestions when no good matches are found
   */
  static generateSuggestions(
    query: string,
    components: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>,
    maxSuggestions: number = 3
  ): string[] {
    // Find matches with a lower score threshold
    const matches = this.findMatches(query, components, {
      maxResults: maxSuggestions * 2,
      minScore: 10, // Lower threshold for suggestions
    });

    const suggestions: string[] = [];
    
    // Add top matches as suggestions
    for (const match of matches.slice(0, maxSuggestions)) {
      suggestions.push(match.name);
    }

    // If we don't have enough suggestions, add some based on common patterns
    if (suggestions.length < maxSuggestions) {
      // Find components with similar word patterns
      const queryWords = query.split(/[-_\s]+/);
      for (const { component } of components) {
        if (suggestions.length >= maxSuggestions) break;
        if (suggestions.includes(component.name)) continue;

        const componentWords = component.name.split(/[-_\s]+/);
        let hasCommonWords = false;
        
        for (const queryWord of queryWords) {
          for (const componentWord of componentWords) {
            if (componentWord.toLowerCase().includes(queryWord.toLowerCase()) || 
                queryWord.toLowerCase().includes(componentWord.toLowerCase())) {
              hasCommonWords = true;
              break;
            }
          }
          if (hasCommonWords) break;
        }

        if (hasCommonWords) {
          suggestions.push(component.name);
        }
      }
    }

    return suggestions;
  }
}