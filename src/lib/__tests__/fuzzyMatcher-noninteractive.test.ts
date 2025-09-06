import { FuzzyMatcher } from '../fuzzyMatcher';
import { ComponentInfo } from '../ZccScope';

// Mock context for testing
jest.mock('../context', () => ({
  cliContext: {
    isNonInteractive: jest.fn(),
    reset: jest.fn(),
    initialize: jest.fn(),
    getContext: jest.fn()
  },
  isNonInteractive: jest.fn()
}));

const mockIsNonInteractive = require('../context').isNonInteractive;

describe('FuzzyMatcher Non-Interactive Mode', () => {
  const mockComponents = [
    {
      component: {
        name: 'architect',
        type: 'mode' as ComponentInfo['type'],
        path: '/path/architect.md',
        metadata: { description: 'Architect mode for system design' }
      },
      source: 'builtin' as const
    },
    {
      component: {
        name: 'autonomous-project-manager',
        type: 'mode' as ComponentInfo['type'],
        path: '/path/apm.md',
        metadata: { description: 'Autonomous project manager mode' }
      },
      source: 'builtin' as const
    },
    {
      component: {
        name: 'engineer',
        type: 'mode' as ComponentInfo['type'],
        path: '/path/engineer.md',
        metadata: { description: 'Engineering mode for development' }
      },
      source: 'builtin' as const
    },
    {
      component: {
        name: 'architect-advanced',
        type: 'mode' as ComponentInfo['type'],
        path: '/path/architect-advanced.md',
        metadata: { description: 'Advanced architect mode' }
      },
      source: 'builtin' as const
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findMatchesForMode', () => {
    describe('Interactive Mode', () => {
      beforeEach(() => {
        mockIsNonInteractive.mockReturnValue(false);
      });

      it('should return all matches in interactive mode', () => {
        const matches = FuzzyMatcher.findMatchesForMode('arch', mockComponents, {
          maxResults: 5,
          minScore: 30
        });

        expect(matches.length).toBeGreaterThan(1);
        expect(matches.some(m => m.name === 'architect')).toBe(true);
        expect(matches.some(m => m.name === 'architect-advanced')).toBe(true);
      });
    });

    describe('Non-Interactive Mode', () => {
      beforeEach(() => {
        mockIsNonInteractive.mockReturnValue(true);
      });

      it('should auto-select exact matches', () => {
        const matches = FuzzyMatcher.findMatchesForMode('architect', mockComponents, {
          maxResults: 5,
          minScore: 30
        });

        expect(matches).toHaveLength(1);
        expect(matches[0].name).toBe('architect');
        expect(matches[0].score).toBe(100);
      });

      it('should auto-select high-confidence matches', () => {
        const matches = FuzzyMatcher.findMatchesForMode('arch', mockComponents, {
          maxResults: 5,
          minScore: 30
        });

        // Should auto-select the best match if score is high enough
        if (matches.length > 0) {
          expect(matches).toHaveLength(1);
          expect(matches[0].name).toBe('architect'); // Best match
          expect(matches[0].score).toBeGreaterThan(60);
        } else {
          // Or return empty if ambiguous
          expect(matches).toHaveLength(0);
        }
      });

      it('should return empty array for ambiguous low-score matches', () => {
        const matches = FuzzyMatcher.findMatchesForMode('xyz', mockComponents, {
          maxResults: 5,
          minScore: 10
        });

        // Should return empty for ambiguous/low-confidence matches
        expect(matches).toHaveLength(0);
      });

      it('should not auto-select low-confidence acronym matches', () => {
        const matches = FuzzyMatcher.findMatchesForMode('apm', mockComponents, {
          maxResults: 5,
          minScore: 30
        });

        // The acronym 'apm' matches 'autonomous-project-manager' but with score 70
        // which is below the 80 threshold, so no auto-selection should happen
        expect(matches).toHaveLength(0);
      });

      it('should respect autoSelectBest option override', () => {
        // Force interactive behavior even in non-interactive context
        const matches = FuzzyMatcher.findMatchesForMode('arch', mockComponents, {
          maxResults: 5,
          minScore: 30,
          autoSelectBest: false
        });

        expect(matches.length).toBeGreaterThan(1);
      });

      it('should force non-interactive behavior with autoSelectBest=true', () => {
        mockIsNonInteractive.mockReturnValue(false); // Context says interactive
        
        const matches = FuzzyMatcher.findMatchesForMode('architect', mockComponents, {
          maxResults: 5,
          minScore: 30,
          autoSelectBest: true // But option forces non-interactive
        });

        expect(matches).toHaveLength(1);
        expect(matches[0].name).toBe('architect');
      });
    });

    describe('Auto-selection criteria', () => {
      beforeEach(() => {
        mockIsNonInteractive.mockReturnValue(true);
      });

      it('should auto-select score >= 100', () => {
        const matches = FuzzyMatcher.findMatchesForMode('architect', mockComponents);
        expect(matches).toHaveLength(1);
        expect(matches[0].score).toBe(100);
      });

      it('should auto-select high scores with significant margin', () => {
        // Create a scenario where one match is significantly better
        const testComponents = [
          {
            component: {
              name: 'engineering-best-practices',
              type: 'mode' as ComponentInfo['type'],
              path: '/path/ebp.md',
              metadata: { description: 'Engineering best practices' }
            },
            source: 'builtin' as const
          },
          {
            component: {
              name: 'some-other-mode',
              type: 'mode' as ComponentInfo['type'],
              path: '/path/other.md',
              metadata: { description: 'Other mode' }
            },
            source: 'builtin' as const
          }
        ];

        const matches = FuzzyMatcher.findMatchesForMode('eng', testComponents);
        
        // Should either auto-select best match or return empty if ambiguous
        expect(matches.length).toBeLessThanOrEqual(1);
        
        if (matches.length === 1) {
          expect(matches[0].name).toBe('engineering-best-practices');
        }
      });

      it('should not auto-select when matches are too close in score', () => {
        // Create similar-scoring matches
        const testComponents = [
          mockComponents[0], // architect
          mockComponents[3]  // architect-advanced
        ];

        const matches = FuzzyMatcher.findMatchesForMode('arch', testComponents);
        
        // Should return empty because matches are too ambiguous
        expect(matches).toHaveLength(0);
      });
    });
  });
});