import { KeywordMatcher } from '../matchers/KeywordMatcher';
import { FuzzyMatcher } from '../matchers/FuzzyMatcher';

describe('KeywordMatcher', () => {
  describe('basic keywords', () => {
    it('should match when keyword is present', () => {
      const matcher = new KeywordMatcher('test');
      expect(matcher.matches('This is a test string')).toBe(true);
      expect(matcher.matches('No match here')).toBe(false);
    });

    it('should match any of multiple keywords', () => {
      const matcher = new KeywordMatcher('test demo example');
      expect(matcher.matches('This is a test')).toBe(true);
      expect(matcher.matches('Here is a demo')).toBe(true);
      expect(matcher.matches('An example here')).toBe(true);
      expect(matcher.matches('No match')).toBe(false);
    });
  });

  describe('required keywords (+)', () => {
    it('should require all required keywords', () => {
      const matcher = new KeywordMatcher('+test +demo');
      expect(matcher.matches('test and demo')).toBe(true);
      expect(matcher.matches('only test')).toBe(false);
      expect(matcher.matches('only demo')).toBe(false);
    });

    it('should work with mix of required and optional', () => {
      const matcher = new KeywordMatcher('+test demo example');
      expect(matcher.matches('test demo')).toBe(true);
      expect(matcher.matches('test example')).toBe(true);
      expect(matcher.matches('demo example')).toBe(false); // missing required 'test'
    });
  });

  describe('excluded keywords (-)', () => {
    it('should exclude when excluded keyword is present', () => {
      const matcher = new KeywordMatcher('test -debug');
      expect(matcher.matches('test string')).toBe(true);
      expect(matcher.matches('test debug mode')).toBe(false);
    });
  });

  describe('optional keywords (?)', () => {
    it('should not affect matching', () => {
      const matcher = new KeywordMatcher('test ?optional');
      expect(matcher.matches('test')).toBe(true);
      expect(matcher.matches('test optional')).toBe(true);
      expect(matcher.matches('optional only')).toBe(false);
    });
  });

  describe('complex patterns', () => {
    it('should handle complex combinations', () => {
      const matcher = new KeywordMatcher('+ticket +create -delete ?auth');
      expect(matcher.matches('create ticket')).toBe(true);
      expect(matcher.matches('create ticket with auth')).toBe(true);
      expect(matcher.matches('create auth')).toBe(false); // missing 'ticket'
      expect(matcher.matches('create ticket delete')).toBe(false); // has excluded word
    });
  });
});

describe('FuzzyMatcher', () => {
  describe('exact matches', () => {
    it('should match exact substrings', () => {
      const matcher = new FuzzyMatcher('run tests');
      expect(matcher.matches('please run tests now')).toBe(true);
      expect(matcher.matches('RUN TESTS')).toBe(true);
    });
  });

  describe('word-level matching', () => {
    it('should match when all words are present', () => {
      const matcher = new FuzzyMatcher('run test', 0.8);
      expect(matcher.matches('run the test')).toBe(true);
      expect(matcher.matches('test run')).toBe(true);
      expect(matcher.matches('running tests')).toBe(true);
    });
  });

  describe('multiple patterns', () => {
    it('should match any of the patterns', () => {
      const matcher = new FuzzyMatcher('run tests|execute tests|test suite', 0.7);
      expect(matcher.matches('run tests')).toBe(true);
      expect(matcher.matches('execute tests')).toBe(true);
      expect(matcher.matches('test suite')).toBe(true);
      expect(matcher.matches('no match')).toBe(false);
    });
  });

  describe('confidence threshold', () => {
    it('should respect confidence threshold', () => {
      const highConfidence = new FuzzyMatcher('test runner', 0.9);
      const lowConfidence = new FuzzyMatcher('test runner', 0.5);
      
      const partialMatch = 'test';
      expect(highConfidence.matches(partialMatch)).toBe(false);
      expect(lowConfidence.matches(partialMatch)).toBe(true);
    });
  });

  describe('typo tolerance', () => {
    it('should match with small typos', () => {
      const matcher = new FuzzyMatcher('ticket', 0.7);
      expect(matcher.matches('tickt')).toBe(true); // 1 deletion
      expect(matcher.matches('tiket')).toBe(true); // 1 substitution
      expect(matcher.matches('tciket')).toBe(true); // 1 transposition
    });
  });
});