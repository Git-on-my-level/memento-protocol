import { Hook } from './Hook';
import { HookContext } from './types';
import { KeywordMatcher } from './matchers/KeywordMatcher';
import { FuzzyMatcher } from './matchers/FuzzyMatcher';

export class UserPromptSubmitHook extends Hook {
  private keywordMatcher?: KeywordMatcher;
  private fuzzyMatcher?: FuzzyMatcher;

  constructor(config: any) {
    super(config);
    
    if (this.config.matcher) {
      switch (this.config.matcher.type) {
        case 'keyword':
          this.keywordMatcher = new KeywordMatcher(this.config.matcher.pattern);
          break;
        case 'fuzzy':
          this.fuzzyMatcher = new FuzzyMatcher(
            this.config.matcher.pattern,
            this.config.matcher.confidence || 0.7
          );
          break;
      }
    }
  }

  shouldRun(context: HookContext): boolean {
    if (!context.prompt) {
      return false;
    }

    // If no matcher is configured, always run
    if (!this.config.matcher) {
      return true;
    }

    const prompt = context.prompt.toLowerCase();

    switch (this.config.matcher.type) {
      case 'regex':
        try {
          const regex = new RegExp(this.config.matcher.pattern, 'i');
          return regex.test(context.prompt);
        } catch {
          return false;
        }

      case 'exact':
        return prompt === this.config.matcher.pattern.toLowerCase();

      case 'keyword':
        return this.keywordMatcher?.matches(context.prompt) || false;

      case 'fuzzy':
        return this.fuzzyMatcher?.matches(context.prompt) || false;

      default:
        return true;
    }
  }
}