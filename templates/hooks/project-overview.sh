#!/usr/bin/env bash
# Project overview hook for Memento Protocol
# Provides a summary of project tickets at session start

echo '## Project Overview'
echo

# Tickets Status
echo '### Tickets Status'
echo

# In Progress Tickets
echo '#### In Progress'
if [ -d ".memento/tickets/in-progress" ]; then
    tickets=$(find .memento/tickets/in-progress -name '*.md' 2>/dev/null)
    if [ -n "$tickets" ]; then
        echo "The following tickets are currently in progress. **You should read these ticket files directly** to understand the current context and continue working on them:"
        echo
        echo "$tickets" | while read -r ticket; do
            ticket_name="$(basename "$ticket" .md)"
            echo "- **$ticket_name** - Read the full ticket: \`$ticket\`"
        done
        echo
        echo "Use the Read tool to examine ticket content directly, as there are no ticket commands to read ticket content automatically."
    else
        echo "No tickets in progress"
    fi
else
    echo "No tickets in progress"
fi
echo

# Next Tickets
echo '#### Next'
if [ -d ".memento/tickets/next" ]; then
    tickets=$(find .memento/tickets/next -name '*.md' 2>/dev/null)
    if [ -n "$tickets" ]; then
        count=$(echo "$tickets" | wc -l | tr -d ' ')
        echo "$count tickets ready to start. **Consider reading these tickets** to understand upcoming work:"
        echo
        echo "$tickets" | while read -r ticket; do
            ticket_name="$(basename "$ticket" .md)"
            echo "- **$ticket_name** - Read the ticket: \`$ticket\`"
        done
    else
        echo "0 tickets"
    fi
else
    echo "0 tickets"
fi
echo

# Done Tickets  
echo '#### Done'
if [ -d ".memento/tickets/done" ]; then
    count=$(find .memento/tickets/done -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "$count tickets completed"
else
    echo "0 tickets"
fi

# Exit successfully
exit 0