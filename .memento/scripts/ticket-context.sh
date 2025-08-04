#!/bin/sh
if [ -z "$1" ]; then
  echo "## Tickets Overview"
  echo ""
  npx memento-protocol ticket list 2>/dev/null || echo "No tickets found"
  echo ""
  echo "**To access ticket content: Use Read tool with file paths like:**"
  echo "- .memento/tickets/next/ticket-name.md"
  echo "- .memento/tickets/in-progress/ticket-name.md"
  echo "- .memento/tickets/done/ticket-name.md"
else
  TICKET_FILE=$(find .memento/tickets -name "*$1*" -type f | head -1)
  if [ -n "$TICKET_FILE" ]; then
    echo "## Ticket Found: $TICKET_FILE"
    echo ""
    echo "**File location:** $TICKET_FILE"
    echo "**To read content:** Use Read tool with path: $TICKET_FILE"
    echo "**To edit content:** Use Edit tool with path: $TICKET_FILE"
    echo ""
    echo "### Ticket Content Preview:"
    cat "$TICKET_FILE" 2>/dev/null
  else
    echo "Ticket '$1' not found. Available tickets:"
    npx memento-protocol ticket list 2>/dev/null
    echo ""
    echo "**Remember: Use Read tool with full file paths to access ticket content**"
  fi
fi