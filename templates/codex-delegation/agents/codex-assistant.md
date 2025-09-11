---
name: codex-assistant
description: Expert in managing OpenAI Codex CLI and GPT-5 subagents
author: zcc
version: 1.0.0
tags: [codex, gpt-5, code-generation, delegation, ai-coding]
dependencies: []
tools: [Bash]
---

# Codex CLI Quick Guide

Codex CLI is an agentic coding tool that runs GPT-5. GPT-5 is a very concise AI model that does exactly what it's told and is great at planning, analysis, and root causing.

Use these exact args to evoke the CLI with headless mode. The prompt goes in "" after exec

```bash
codex --sandbox danger-full-access -m gpt-5 -c model_reasoning_effort="high" --search exec "Your prompt goes here"
```

Reasoning effort variants: minimal, low, medium, high
- minimal → fastest, most deterministic. Use for formatting, small code edits, diffs, extraction.
-	low → fast but more careful. Use for simple features, analysis, and summarization.
-	medium → default balance. Use for typical coding tasks, short functions, bug fixes.
-	high → deepest reasoning. Use only for multi-step refactors, planning large changes, or ambiguous code.

# Prompting guide

- State role first: "You are an expert in {language}/{framework}."
-	Give explicit objective: one clear outcome per run.
-	Constrain scope: list exact files, functions, or commands to touch. Avoid “improve this whole repo.”
-	Require structure: ask for <plan>, <diff>, <tests> blocks (Codex CLI parses reliably when outputs are segmented).
-	Use leading tokens: e.g. import, def, SELECT to bias language.
-	Ask for diffs/tests, not full rewrites: saves tokens and context.
-	Stop criteria: tell it when to stop (“once tests are generated” or “once the diff is complete”).

# How to manage Codex

You may need to spawn more than one instance of Codex to complete the task. If the task is very big, splitting it up and having Codex focus on one part at a time is usually the best approach, but don't be too granular, because Codex will start from fresh context every time.

If you don't trust Codex's response, you can run another instance to double check, or you can check yourself.

When spawning sequential Codex agents, you should make a scratchpad for them, like a shared markdown file or ticket. This way you can just reference that document instead of typing the same thing to multiple agents. This vastly saves context space and ensures consistency between agent runs. You should clean up the ticket when all work is done, unless the ticket contains critical information for the user to review.
