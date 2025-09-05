#!/bin/sh
if [ -z "$1" ]; then
  npx zcc ticket list 2>/dev/null || echo "No tickets found"
else
  find .zcc/tickets -name "*$1*" -type f | head -1 | xargs cat 2>/dev/null || {
    echo "Ticket '$1' not found. Available tickets:"
    npx zcc ticket list 2>/dev/null
  }
fi