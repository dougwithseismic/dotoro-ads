#!/bin/bash

# Count lines of code (excluding node_modules, build artifacts, etc.)
LOC=$(/usr/bin/find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.astro" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/.astro/*" \
  ! -path "*/coverage/*" \
  ! -path "*/.turbo/*" \
  -print0 | /usr/bin/xargs -0 /usr/bin/wc -l 2>/dev/null | /usr/bin/tail -1 | /usr/bin/awk '{print $1}')

# Format number with k suffix if > 1000
if [ "$LOC" -ge 1000 ]; then
  LOC_DISPLAY=$(echo "scale=1; $LOC / 1000" | bc)k
else
  LOC_DISPLAY=$LOC
fi

# Badge markdown (using shields.io static badge)
BADGE="![Lines of Code](https://img.shields.io/badge/LOC-${LOC_DISPLAY}-blue)"

# Check if badge line already exists
if grep -q "^\!\[Lines of Code\]" README.md; then
  # Update existing badge
  sed -i '' "s|^\!\[Lines of Code\].*|${BADGE}|" README.md
  echo "Updated LOC badge: $LOC_DISPLAY ($LOC lines)"
else
  # Insert badge after first line (title)
  sed -i '' "1a\\
\\
${BADGE}
" README.md
  echo "Added LOC badge: $LOC_DISPLAY ($LOC lines)"
fi
