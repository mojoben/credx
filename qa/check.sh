#!/bin/sh
# Rebuild, capture the local preview (must be running on :4331) and diff against the live capture.
#   sh qa/check.sh <width> [page-key ...]
set -e
cd "$(dirname "$0")/.."
W=${1:-1440}; shift || true
npx astro build >/dev/null
BASE=http://localhost:4331 OUT=local node qa/capture-live.mjs "$W" "$@" >/dev/null
for k in ${@:-home auction investment commercial process why quote privacy complaints}; do
  node qa/diff.mjs "$k" "$W" 2
done
