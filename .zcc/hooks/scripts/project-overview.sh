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
        echo "$tickets" | while read -r ticket; do
            echo "- $(basename "$ticket" .md)"
        done
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
    count=$(find .memento/tickets/next -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "$count tickets"
else
    echo "0 tickets"
fi
echo

# Done Tickets  
echo '#### Done'
if [ -d ".memento/tickets/done" ]; then
    count=$(find .memento/tickets/done -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "$count tickets"
else
    echo "0 tickets"
fi

# Exit successfully
exit 0