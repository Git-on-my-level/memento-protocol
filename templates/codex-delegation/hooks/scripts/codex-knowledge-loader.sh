#!/usr/bin/env bash
# Codex Knowledge Loader Hook - Injects essential Codex knowledge at session start
set -euo pipefail

cat << 'EOF'
# Codex CLI Quick Guide

Codex CLI is an agentic coding tool that runs GPT-5. GPT-5 is a very concise AI model that does exactly what it's told and is great at planning, analysis, and root causing.

Use these exact args to evoke the Codex CLI with headless mode. The prompt goes in "" after exec

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
```
EOF

exit 0