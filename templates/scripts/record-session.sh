#!/usr/bin/env bash
set -euo pipefail

project_root="${PWD}"
tickets_dir="${project_root}/.memento/tickets"
statuses=("next" "in-progress" "done")
ticket_name_raw="${1:-}"

sanitize() {
  printf '%s' "$1" \
    | tr -d '\000-\037\177' \
    | sed -E \
      -e 's/\.+/-/g' \
      -e 's#[/\\]+#-#g' \
      -e 's/[^a-zA-Z0-9_-]/-/g' \
      -e 's/-{2,}/-/g' \
      -e 's/^-+//; s/-+$//' \
    | cut -c1-100
}

rand_hex() {
  od -An -N3 -tx1 /dev/urandom | tr -d ' \n'
}

iso_now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

local_now() {
  date +"%Y-%m-%d %H:%M:%S"
}

json_escape() {
  # Escape backslashes and double quotes for JSON strings
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

find_existing_ticket() {
  local name="$1"
  local p
  for s in "${statuses[@]}"; do
    p="${tickets_dir}/${s}/${name}.md"
    if [ -f "$p" ]; then
      printf '%s\n' "$p"
      return 0
    fi
  done
  return 1
}

ticket_name="$ticket_name_raw"
if [ -n "$ticket_name" ]; then
  ticket_name="$(sanitize "$ticket_name")"
fi

timestamp="$(iso_now_utc)"
local_time="$(local_now)"

if [ -z "$ticket_name" ]; then
  ticket_name="session-$(date +%F)-$(rand_hex)"
fi

ticket_path=""
if existing_path="$(find_existing_ticket "$ticket_name")"; then
  is_new=false
  session_section=$(cat <<EOF

---

## Session Entry - ${local_time}

### Summary
<!-- AI_SUMMARY_START -->
[AI will generate a comprehensive summary here based on recent work, changes made, and next steps]
<!-- AI_SUMMARY_END -->

### Context
```
No automatic context
```
EOF
)
  printf '%s' "$session_section" >> "$existing_path"
  ticket_path="$existing_path"
else
  is_new=true
  ticket_path="${tickets_dir}/next/${ticket_name}.md"
  mkdir -p "$(dirname "$ticket_path")"
  cat > "$ticket_path" <<EOF
# ${ticket_name}

## Description
Session-based ticket created for AI summarization.

## Tasks
- [ ] Review session context
- [ ] Define specific tasks based on work completed

## Session Entry - ${local_time}

### Summary
<!-- AI_SUMMARY_START -->
[AI will generate a comprehensive summary here based on recent work, changes made, and next steps]
<!-- AI_SUMMARY_END -->

### Context
```
No automatic context
```

---
Created: ${timestamp}
EOF
fi

if [ "$is_new" = true ]; then
  message="Created new ticket: ${ticket_name}"
else
  message="Updated existing ticket: ${ticket_name}"
fi

tn_esc="$(json_escape "$ticket_name")"
tp_esc="$(json_escape "$ticket_path")"
msg_esc="$(json_escape "$message")"

printf '{\n'
printf '  "success": true,\n'
printf '  "ticketName": "%s",\n' "$tn_esc"
printf '  "ticketPath": "%s",\n' "$tp_esc"
printf '  "isNew": %s,\n' "$is_new"
printf '  "message": "%s"\n' "$msg_esc"
printf '}\n'


