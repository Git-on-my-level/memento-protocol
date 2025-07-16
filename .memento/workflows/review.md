# Review Workflow

A structured approach to code review that ensures quality, security, and maintainability through systematic evaluation.

## 1. Assess objective

- Make sure you understand what the real objective is, for example the purpose of the new feature or product, what the success and failure conditions are supposed to look like.
- Think about what could look technically correct but not match the spirit of the objective.

## 2. Figure out what's in scope

- Get a clear picture of the key edits that were made, use git to see the changes
- Assess if there's any upstream or downstream dependencies that you need to look at to have a better understanding of how the changes impact the rest of the codebase, and look at them.

## 3. Review the changes

- Check for bugs, misalignment between code and objective, security vulnerabilities, bad code smells, lack of testability, and other best practices that a principal engineer would look for
- Be pragmatic in your review. Don't suggest over-engineered solutions and don't make purely stylistic suggestions. ONLY if the code deviates in style substantially from the rest of the code you've looked at, call it out, for example it isn't using the same logging library, or it doesn't loading the config in the same way, things that would impact maintainability or readability.
  