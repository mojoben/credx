#!/bin/sh
# /data is the volume that keeps the enquiry log across deploys. A fresh volume can arrive owned
# by root, so take it over for the app user, then drop root and exec node.
set -e
DIR="${ENQUIRY_LOG_DIR:-/data}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DIR"
  chown node:node "$DIR"
  exec su-exec node "$@"
fi
exec "$@"
