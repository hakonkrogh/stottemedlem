#!/usr/bin/env bash
# Upload PR screenshots to the `pr-screenshots` branch (never merged, so the
# PNGs stay out of main) and print the Markdown to paste into the PR body.
#
#   .claude/skills/preview-screenshot/pr-shots.sh <folder> <file.png>...
#
# <folder> is usually the PR's branch name. Files keep their basename; an
# upload with the same name replaces the old one. Works from any worktree
# without touching the checkout: it builds the commit with a temporary index.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <folder> <file.png>..." >&2
  exit 1
fi
folder="$1"
shift

branch=pr-screenshots
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

# Fetch before switching the index: git refuses an empty (0-byte) index
# file, which is what mktemp makes. Hiding that failure once built a commit
# with no parent and the push was rejected as non-fast-forward (2026-11-02).
parent=""
if git ls-remote --exit-code -q origin "refs/heads/$branch" >/dev/null; then
  git fetch -q origin "$branch"
  parent=$(git rev-parse FETCH_HEAD)
fi

index=$(mktemp)
rm -f "$index"
trap 'rm -f "$index"' EXIT
export GIT_INDEX_FILE="$index"

if [ -n "$parent" ]; then
  git read-tree "$parent"
else
  git read-tree --empty
fi

for file in "$@"; do
  blob=$(git hash-object -w "$file")
  git update-index --add --cacheinfo "100644,$blob,$folder/$(basename "$file")"
done

tree=$(git write-tree)
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "screenshots: $folder")
git push -q origin "$commit:refs/heads/$branch"

for file in "$@"; do
  name=$(basename "$file")
  echo "![${name%.*}](https://github.com/$repo/blob/$branch/$folder/$name?raw=true)"
done
