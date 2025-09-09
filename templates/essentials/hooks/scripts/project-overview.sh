#!/usr/bin/env bash
# Project overview hook for zcc
# Provides a summary of project tickets at session start

echo '## Project Overview'
echo

# Tickets Status
echo '### Tickets Status'
echo

# In Progress Tickets
echo '#### In Progress'
if [ -d ".zcc/tickets/in-progress" ]; then
    tickets=$(find .zcc/tickets/in-progress -name '*.md' 2>/dev/null)
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
if [ -d ".zcc/tickets/next" ]; then
    count=$(find .zcc/tickets/next -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "$count tickets"
else
    echo "0 tickets"
fi
echo

# Done Tickets  
echo '#### Done'
if [ -d ".zcc/tickets/done" ]; then
    count=$(find .zcc/tickets/done -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "$count tickets"
else
    echo "0 tickets"
fi

# Exit successfully
exit 0