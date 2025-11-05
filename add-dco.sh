#!/bin/bash
# Add DCO sign-off to commit message if missing
if ! grep -q "Signed-off-by" <<< "$(cat)"; then
  cat
  echo ""
  echo "Signed-off-by: Rick1330 <elishum8@gmail.com>"
else
  cat
fi

