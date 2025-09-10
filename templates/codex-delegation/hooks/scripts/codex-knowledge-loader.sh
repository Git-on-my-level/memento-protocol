#!/usr/bin/env bash
# Codex Knowledge Loader Hook - Injects essential Codex knowledge at session start
set -euo pipefail

cat << 'EOF'
# Codex CLI Quick Guide

Codex CLI is an agentic coding tool that runs GPT-5.

Use these exact args to evoke the Codex CLI with headless mode. The prompt goes in "" after exec

```bash
codex --sandbox danger-full-access -m gpt-5 -c model_reasoning_effort="high" --search exec "Your prompt goes here"
```

Reasoning effort variants: low, medium, high
```
EOF

exit 0