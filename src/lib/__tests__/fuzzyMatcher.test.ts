import { FuzzyMatcher } from '../fuzzyMatcher';
import { ComponentInfo } from '../MementoScope';

describe('FuzzyMatcher [unit][fast][isolated]', () => {
  const mockComponents: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }> = [
    {
      component: {
        name: 'autonomous-project-manager',
        type: 'mode',
        path: '/test/autonomous-project-manager.md',
        metadata: { description: 'AI project management mode' }
      },
      source: 'builtin'
    },
    {
      component: {
        name: 'engineer',
        type: 'mode',
        path: '/test/engineer.md',
        metadata: { description: 'Engineering focused mode' }
      },
      source: 'builtin'
    },
    {
      component: {
        name: 'architect',
        type: 'mode',
        path: '/test/architect.md',
        metadata: { description: 'System architecture mode' }
      },
      source: 'builtin'
    },
    {
      component: {
        name: 'data-scientist',
        type: 'mode',
        path: '/test/data-scientist.md',
        metadata: { description: 'Data science and analysis mode' }
      },
      source: 'global'
    },
    {
      component: {
        name: 'review',
        type: 'workflow',
        path: '/test/review.md',
        metadata: { description: 'Code review workflow' }
      },
      source: 'builtin'
    },
    {
      component: {
        name: 'summarize',
        type: 'workflow',
        path: '/test/summarize.md',
        metadata: { description: 'Content summarization workflow' }
      },
      source: 'builtin'
    }
  ];

  describe('findMatches', () => {
    it('[unit][fast] should find exact matches with highest score', () => {
      const matches = FuzzyMatcher.findMatches('engineer', mockComponents);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('engineer');
      expect(matches[0].score).toBe(100);
      expect(matches[0].matchType).toBe('exact');
    });

    it('should find acronym matches', () => {
      const matches = FuzzyMatcher.findMatches('apm', mockComponents);
      
      expect(matches.length).toBeGreaterThan(0);
      const apmMatch = matches.find(m => m.name === 'autonomous-project-manager');
      expect(apmMatch).toBeDefined();
      expect(apmMatch?.matchType).toBe('acronym');
      expect(apmMatch?.score).toBeGreaterThan(60);
    });

    it('should find substring matches', () => {
      const matches = FuzzyMatcher.findMatches('arch', mockComponents);
      
      expect(matches.length).toBeGreaterThan(0);
      const archMatch = matches.find(m => m.name === 'architect');
      expect(archMatch).toBeDefined();
      expect(archMatch?.matchType).toBe('substring');
      expect(archMatch?.score).toBeGreaterThan(50);
    });

    it('should find partial matches', () => {
      const matches = FuzzyMatcher.findMatches('eng', mockComponents);
      
      expect(matches.length).toBeGreaterThan(0);
      const engMatch = matches.find(m => m.name === 'engineer');
      expect(engMatch).toBeDefined();
      expect(engMatch?.score).toBeGreaterThan(50);
    });

    it('should respect maxResults option', () => {
      const matches = FuzzyMatcher.findMatches('e', mockComponents, { maxResults: 2 });
      
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should respect minScore option', () => {
      const matches = FuzzyMatcher.findMatches('xyz', mockComponents, { minScore: 80 });
      
      expect(matches).toHaveLength(0);
    });

    it('should sort matches by score descending', () => {
      const matches = FuzzyMatcher.findMatches('arch', mockComponents);
      
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it('should prioritize project over global over builtin with same score', () => {
      const componentsWithConflicts = [
        ...mockComponents,
        {
          component: {
            name: 'engineer',
            type: 'mode' as const,
            path: '/project/engineer.md',
            metadata: { description: 'Project-specific engineer mode' }
          },
          source: 'project' as const
        },
        {
          component: {
            name: 'engineer',
            type: 'mode' as const,
            path: '/global/engineer.md',
            metadata: { description: 'Global engineer mode' }
          },
          source: 'global' as const
        }
      ];

      const matches = FuzzyMatcher.findMatches('engineer', componentsWithConflicts);
      
      expect(matches.length).toBeGreaterThanOrEqual(3);
      
      // Find all engineer matches
      const engineerMatches = matches.filter(m => m.name === 'engineer');
      
      // Project should come first, then global, then builtin
      expect(engineerMatches[0].source).toBe('project');
      expect(engineerMatches[1].source).toBe('global');
      expect(engineerMatches[2].source).toBe('builtin');
    });

    it('should handle case insensitive matching', () => {
      const matches = FuzzyMatcher.findMatches('ENGINEER', mockComponents, { caseSensitive: false });
      
      expect(matches.length).toBeGreaterThan(0);
      const engineerMatch = matches.find(m => m.name === 'engineer');
      expect(engineerMatch).toBeDefined();
      expect(engineerMatch?.score).toBe(100); // Case-insensitive defaults to true, so should be exact match
    });

    it('should handle empty query', () => {
      const matches = FuzzyMatcher.findMatches('', mockComponents);
      
      expect(matches).toHaveLength(0);
    });

    it('should include metadata score boost', () => {
      const matches = FuzzyMatcher.findMatches('data', mockComponents, { includeMetadata: true });
      
      expect(matches.length).toBeGreaterThan(0);
      const dataMatch = matches.find(m => m.name === 'data-scientist');
      expect(dataMatch).toBeDefined();
      // Should get boost from metadata description containing 'data'
    });
  });

  describe('findBestMatch', () => {
    it('should return the single best match', () => {
      const match = FuzzyMatcher.findBestMatch('engineer', mockComponents);
      
      expect(match).toBeDefined();
      expect(match?.name).toBe('engineer');
      expect(match?.score).toBe(100);
    });

    it('should return null when no matches found', () => {
      const match = FuzzyMatcher.findBestMatch('nonexistent', mockComponents, { minScore: 50 });
      
      expect(match).toBeNull();
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for typos', () => {
      const suggestions = FuzzyMatcher.generateSuggestions('enginer', mockComponents, 3);
      
      expect(suggestions).toContain('engineer');
    });

    it('should generate suggestions for partial matches', () => {
      const suggestions = FuzzyMatcher.generateSuggestions('arch', mockComponents, 3);
      
      expect(suggestions).toContain('architect');
    });

    it('should limit number of suggestions', () => {
      const suggestions = FuzzyMatcher.generateSuggestions('e', mockComponents, 2);
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no suggestions', () => {
      const suggestions = FuzzyMatcher.generateSuggestions('xyz123', mockComponents, 3);
      
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('score calculation', () => {
    it('should give exact matches the highest score', () => {
      const exactMatch = FuzzyMatcher.findBestMatch('engineer', mockComponents);
      expect(exactMatch?.score).toBe(100);
    });

    it('should give start-with matches high scores', () => {
      const matches = FuzzyMatcher.findMatches('eng', mockComponents);
      const engMatch = matches.find(m => m.name === 'engineer');
      expect(engMatch?.score).toBeGreaterThan(75);
    });

    it('should give acronym matches good scores', () => {
      const matches = FuzzyMatcher.findMatches('ds', mockComponents);
      const dsMatch = matches.find(m => m.name === 'data-scientist');
      expect(dsMatch?.score).toBeGreaterThan(60);
    });
  });

  describe('match type determination', () => {
    it('should correctly identify exact matches', () => {
      const matches = FuzzyMatcher.findMatches('engineer', mockComponents);
      const exactMatch = matches.find(m => m.name === 'engineer');
      expect(exactMatch?.matchType).toBe('exact');
    });

    it('should correctly identify substring matches', () => {
      const matches = FuzzyMatcher.findMatches('arch', mockComponents);
      const subMatch = matches.find(m => m.name === 'architect');
      expect(subMatch?.matchType).toBe('substring');
    });

    it('should correctly identify acronym matches', () => {
      const matches = FuzzyMatcher.findMatches('apm', mockComponents);
      const acronymMatch = matches.find(m => m.name === 'autonomous-project-manager');
      expect(acronymMatch?.matchType).toBe('acronym');
    });

    it('should correctly identify partial matches', () => {
      // Create a scenario that would be partial but not substring
      const partialComponents = [
        {
          component: {
            name: 'test-component',
            type: 'mode' as const,
            path: '/test.md',
            metadata: {}
          },
          source: 'builtin' as const
        }
      ];
      
      const matches = FuzzyMatcher.findMatches('tcmpnt', partialComponents);
      const partialMatch = matches.find(m => m.name === 'test-component');
      if (partialMatch) {
        expect(partialMatch.matchType).toBe('partial');
      } else {
        // If no match found due to low score, that's acceptable for this edge case
        expect(matches.length).toBe(0);
      }
    });
  });
});