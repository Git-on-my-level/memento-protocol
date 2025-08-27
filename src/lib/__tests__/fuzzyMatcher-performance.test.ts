import { FuzzyMatcher } from '../fuzzyMatcher';
import { ComponentInfo } from '../MementoScope';

describe('FuzzyMatcher Performance', () => {
  // Generate a large set of mock components to test performance
  function generateMockComponents(count: number): Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }> {
    const components = [];
    const types: ComponentInfo['type'][] = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'];
    const sources: Array<'builtin' | 'global' | 'project'> = ['builtin', 'global', 'project'];
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const source = sources[i % sources.length];
      
      components.push({
        component: {
          name: `${type}-component-${i}`,
          type: type as ComponentInfo['type'],
          path: `/test/${type}s/${type}-component-${i}.md`,
          metadata: {
            description: `Test ${type} component ${i}`,
            tags: [`tag-${i % 10}`]
          }
        },
        source
      });
    }
    
    // Add some components with common patterns for realistic testing
    const commonPatterns = [
      'engineer', 'architect', 'reviewer', 'data-scientist',
      'autonomous-project-manager', 'ai-debt-maintainer',
      'review', 'summarize', 'analyze', 'document'
    ];
    
    for (const pattern of commonPatterns) {
      for (const source of sources) {
        components.push({
          component: {
            name: pattern,
            type: 'mode' as ComponentInfo['type'],
            path: `/test/modes/${pattern}.md`,
            metadata: {
              description: `${pattern} mode`,
              tags: ['common']
            }
          },
          source
        });
      }
    }
    
    return components;
  }

  describe('large component sets', () => {
    const componentCounts = [100, 500, 1000];
    
    componentCounts.forEach(count => {
      it(`should handle ${count} components efficiently`, () => {
        const components = generateMockComponents(count);
        
        // Test exact match performance
        const startTime = process.hrtime.bigint();
        
        const exactMatch = FuzzyMatcher.findBestMatch('engineer', components);
        
        const endTime = process.hrtime.bigint();
        const executionTimeMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        expect(exactMatch).toBeDefined();
        expect(exactMatch?.name).toBe('engineer');
        
        // Should complete within reasonable time (adjust threshold as needed)
        expect(executionTimeMs).toBeLessThan(100); // 100ms threshold
        
        console.log(`Exact match with ${count} components took ${executionTimeMs.toFixed(2)}ms`);
      });
      
      it(`should handle fuzzy search with ${count} components efficiently`, () => {
        const components = generateMockComponents(count);
        
        const startTime = process.hrtime.bigint();
        
        const fuzzyMatches = FuzzyMatcher.findMatches('eng', components, { maxResults: 10 });
        
        const endTime = process.hrtime.bigint();
        const executionTimeMs = Number(endTime - startTime) / 1000000;
        
        expect(fuzzyMatches.length).toBeGreaterThan(0);
        
        // Should complete within reasonable time
        expect(executionTimeMs).toBeLessThan(200); // 200ms threshold for fuzzy search
        
        console.log(`Fuzzy search with ${count} components took ${executionTimeMs.toFixed(2)}ms`);
      });
      
      it(`should handle acronym matching with ${count} components efficiently`, () => {
        const components = generateMockComponents(count);
        
        const startTime = process.hrtime.bigint();
        
        const acronymMatches = FuzzyMatcher.findMatches('apm', components);
        
        const endTime = process.hrtime.bigint();
        const executionTimeMs = Number(endTime - startTime) / 1000000;
        
        // Should find autonomous-project-manager
        const apmMatch = acronymMatches.find(m => m.name === 'autonomous-project-manager');
        expect(apmMatch).toBeDefined();
        
        // Should complete within reasonable time
        expect(executionTimeMs).toBeLessThan(150); // 150ms threshold
        
        console.log(`Acronym matching with ${count} components took ${executionTimeMs.toFixed(2)}ms`);
      });
    });
  });

  describe('memory usage', () => {
    it('should not cause excessive memory usage with large component sets', () => {
      const components = generateMockComponents(2000);
      
      // Get baseline memory usage
      const baseline = process.memoryUsage();
      
      // Perform multiple searches
      for (let i = 0; i < 10; i++) {
        FuzzyMatcher.findMatches(`test-${i}`, components, { maxResults: 5 });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterSearch = process.memoryUsage();
      
      // Memory increase should be reasonable (less than 50MB for this test)
      const memoryIncrease = afterSearch.heapUsed - baseline.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('cache behavior', () => {
    it('should demonstrate performance improvement with repeated searches', () => {
      const components = generateMockComponents(1000);
      
      // First search (cold)
      const startCold = process.hrtime.bigint();
      FuzzyMatcher.findMatches('engineer', components);
      const endCold = process.hrtime.bigint();
      const coldTimeMs = Number(endCold - startCold) / 1000000;
      
      // Subsequent searches (may benefit from string interning or other optimizations)
      const times = [];
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        FuzzyMatcher.findMatches('engineer', components);
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1000000);
      }
      
      const avgWarmTime = times.reduce((a, b) => a + b) / times.length;
      
      console.log(`Cold search: ${coldTimeMs.toFixed(2)}ms, Average warm: ${avgWarmTime.toFixed(2)}ms`);
      
      // Both should be reasonable, warm might be slightly faster
      expect(coldTimeMs).toBeLessThan(200);
      expect(avgWarmTime).toBeLessThan(200);
    });
  });
});