#!/bin/sh
if [ -z "$1" ]; then
  echo "## Tickets Overview"
  echo ""
  npx memento-protocol ticket list 2>/dev/null || echo "No tickets found"
else
  TICKET_FILE=$(find .memento/tickets -name "*$1*" -type f | head -1)
  if [ -n "$TICKET_FILE" ]; then
    echo "## Ticket: $1"
    echo ""
    cat "$TICKET_FILE" 2>/dev/null
  else
    echo "Ticket '$1' not found. Available tickets:"
    npx memento-protocol ticket list 2>/dev/null
  fi
fi