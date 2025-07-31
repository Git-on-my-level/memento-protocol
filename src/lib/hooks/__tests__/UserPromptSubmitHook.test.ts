import { UserPromptSubmitHook } from '../UserPromptSubmitHook';
import { HookConfig, HookContext } from '../types';

describe('UserPromptSubmitHook', () => {
  const baseConfig: HookConfig = {
    id: 'test',
    name: 'Test Hook',
    event: 'UserPromptSubmit',
    enabled: true,
    command: 'echo test'
  };

  const baseContext: HookContext = {
    event: 'UserPromptSubmit',
    projectRoot: '/test',
    timestamp: Date.now()
  };

  describe('shouldRun', () => {
    it('should return false when no prompt in context', () => {
      const hook = new UserPromptSubmitHook(baseConfig);
      expect(hook.shouldRun(baseContext)).toBe(false);
    });

    it('should return true when no matcher configured', () => {
      const hook = new UserPromptSubmitHook(baseConfig);
      const context = { ...baseContext, prompt: 'test prompt' };
      expect(hook.shouldRun(context)).toBe(true);
    });

    describe('regex matcher', () => {
      it('should match regex patterns', () => {
        const config = {
          ...baseConfig,
          matcher: { type: 'regex' as const, pattern: '^test.*' }
        };
        const hook = new UserPromptSubmitHook(config);
        
        expect(hook.shouldRun({ ...baseContext, prompt: 'test something' })).toBe(true);
        expect(hook.shouldRun({ ...baseContext, prompt: 'not test' })).toBe(false);
      });

      it('should handle invalid regex gracefully', () => {
        const config = {
          ...baseConfig,
          matcher: { type: 'regex' as const, pattern: '[invalid' }
        };
        const hook = new UserPromptSubmitHook(config);
        
        expect(hook.shouldRun({ ...baseContext, prompt: 'test' })).toBe(false);
      });
    });

    describe('exact matcher', () => {
      it('should match exact strings case-insensitive', () => {
        const config = {
          ...baseConfig,
          matcher: { type: 'exact' as const, pattern: 'Test Prompt' }
        };
        const hook = new UserPromptSubmitHook(config);
        
        expect(hook.shouldRun({ ...baseContext, prompt: 'test prompt' })).toBe(true);
        expect(hook.shouldRun({ ...baseContext, prompt: 'TEST PROMPT' })).toBe(true);
        expect(hook.shouldRun({ ...baseContext, prompt: 'test prompt!' })).toBe(false);
      });
    });

    describe('keyword matcher', () => {
      it('should use keyword matching', () => {
        const config = {
          ...baseConfig,
          matcher: { type: 'keyword' as const, pattern: '+test +hook -debug' }
        };
        const hook = new UserPromptSubmitHook(config);
        
        expect(hook.shouldRun({ ...baseContext, prompt: 'test the hook' })).toBe(true);
        expect(hook.shouldRun({ ...baseContext, prompt: 'test only' })).toBe(false);
        expect(hook.shouldRun({ ...baseContext, prompt: 'test hook debug' })).toBe(false);
      });
    });

    describe('fuzzy matcher', () => {
      it('should use fuzzy matching with confidence', () => {
        const config = {
          ...baseConfig,
          matcher: { 
            type: 'fuzzy' as const, 
            pattern: 'run tests',
            confidence: 0.7 
          }
        };
        const hook = new UserPromptSubmitHook(config);
        
        expect(hook.shouldRun({ ...baseContext, prompt: 'run tests please' })).toBe(true);
        expect(hook.shouldRun({ ...baseContext, prompt: 'execute testing' })).toBe(false);
      });
    });
  });
});