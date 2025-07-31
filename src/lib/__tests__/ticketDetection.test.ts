import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

describe("Ticket Detection in Routing Hook", () => {
  const hookPath = path.join(__dirname, "../../../.memento/hooks/scripts/memento-routing.sh");
  
  // Helper to test a prompt through the routing hook
  const testPrompt = (prompt: string): string => {
    try {
      const jsonInput = JSON.stringify({ prompt });
      const result = execSync(`echo '${jsonInput}' | ${hookPath}`, {
        encoding: "utf-8",
        cwd: path.join(__dirname, "../../../"),
      });
      return result;
    } catch (error) {
      return "";
    }
  };

  beforeAll(() => {
    // Ensure the hook exists
    expect(fs.existsSync(hookPath)).toBe(true);
  });

  describe("High-confidence patterns", () => {
    const testCases = [
      "I need to create a new ticket for the login feature",
      "Can you list all tickets?",
      "How do I work with tickets?",
      "Move ticket to done status",
      "How to use ticket create command?",
    ];

    testCases.forEach((prompt) => {
      it(`should show detailed help for: "${prompt}"`, () => {
        const output = testPrompt(prompt);
        expect(output).toContain("Ticket System - Quick Reference");
        expect(output).toContain("npx memento-protocol ticket create");
      });
    });
  });

  describe("Low-confidence patterns", () => {
    const testCases = [
      "The support ticket system is broken",
      "I got a parking ticket",
    ];

    testCases.forEach((prompt) => {
      it(`should show minimal help for: "${prompt}"`, () => {
        const output = testPrompt(prompt);
        expect(output).toContain("Ticket System Available");
        expect(output).not.toContain("Ticket System - Quick Reference");
      });
    });
  });

  describe("No detection patterns", () => {
    const testCases = [
      "Please refactor the authentication module",
      "Check the ticker symbol",
      "Show me all ticekts", // Typo should not trigger
    ];

    testCases.forEach((prompt) => {
      it(`should not inject context for: "${prompt}"`, () => {
        const output = testPrompt(prompt);
        expect(output).not.toContain("Ticket System");
      });
    });
  });

  describe("Edge cases", () => {
    it("should not inject context for explicit ticket requests", () => {
      const output = testPrompt("ticket: implement-auth");
      expect(output).not.toContain("Ticket System Available");
      expect(output).not.toContain("Ticket System - Quick Reference");
    });

    it("should handle case-insensitive detection", () => {
      const output = testPrompt("CREATE A NEW TICKET");
      expect(output).toContain("Ticket System - Quick Reference");
    });
  });
});