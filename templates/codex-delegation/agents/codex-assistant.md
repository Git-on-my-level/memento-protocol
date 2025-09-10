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

Codex CLI is an agentic coding tool that runs GPT-5.

Use these exact args to evoke the CLI with headless mode. The prompt goes in "" after exec

```bash
codex --sandbox danger-full-access -m gpt-5 -c model_reasoning_effort="high" --search exec "Your prompt goes here"
```

Reasoning effort variants: low, medium, high

# How to manage Codex

You should pay attention to the output of Codex after it finishes running. It will tell you if there are follow-up items or if the task was not completed. You should decide if you should start a follow-up Codex instance to continue or try a different approach depending on the output. Codex performs best if you provide it with plentiful and accurate context. Do not confuse it by being overly presecriptive. Codex is very agentic, it will scope things out before starting work, so if you give it hints about where to look it will massively increase it's chances of success.

Upon completion, if you are happy with the final result, you can provide a quick summary of what was done. If Codex keeps getting stuck and cannot complete the job, please explain why.
