#!/bin/bash
# Restore proper commit messages and add DCO

# Get the commit hash
COMMIT_HASH=$(git log -1 --format="%H")

# Map of known commit hashes to proper messages
declare -A COMMIT_MESSAGES=(
    ["9319a804b2d467302a319189f8e9daababd02232"]="feat(web): implement centralized input validation with Zod (ST-203)"
    ["3af0e88f2db3477c50639a22277fe2dd6b12755b"]="fix(validation): correct ZodError property from 'errors' to 'issues' and reduce complexity"
    ["4e9ffc45e0bef9692bb7ec6a12f5d5eee0039b1d"]="refactor(validation): reduce validatePassword complexity and fix formatting"
)

# Get current message
CURRENT_MSG=$(cat)

# Check if this is a known commit with a proper message
if [[ -n "${COMMIT_MESSAGES[$COMMIT_HASH]}" ]]; then
    # Use the proper message
    echo "${COMMIT_MESSAGES[$COMMIT_HASH]}"
    echo ""
    echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
elif [[ "$CURRENT_MSG" == "Signed-off-by: Rick1330 <elishum8@gmail.com>" ]] || [[ "$CURRENT_MSG" == *"Signed-off-by"* ]] && [[ "$CURRENT_MSG" != *"feat"* ]] && [[ "$CURRENT_MSG" != *"fix"* ]] && [[ "$CURRENT_MSG" != *"refactor"* ]]; then
    # This is a corrupted commit - try to infer message from file changes
    CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r $COMMIT_HASH)
    if echo "$CHANGED_FILES" | grep -q "validation.ts"; then
        echo "fix(validation): add input validation improvements"
        echo ""
        echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
    elif echo "$CHANGED_FILES" | grep -q "route.ts"; then
        echo "fix(auth): update auth routes"
        echo ""
        echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
    else
        echo "$CURRENT_MSG"
        if ! echo "$CURRENT_MSG" | grep -q "Signed-off-by"; then
            echo ""
            echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
        fi
    fi
else
    # Keep existing message, just ensure DCO is present
    echo "$CURRENT_MSG"
    if ! echo "$CURRENT_MSG" | grep -q "Signed-off-by"; then
        echo ""
        echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
    fi
fi

