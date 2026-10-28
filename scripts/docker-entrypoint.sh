#!/bin/sh
set -eu

# A newly mounted hosting volume can belong to root. Initialize our uploads folder;
# the Next.js server and database release command run as the unprivileged user.
mkdir -p "${UPLOAD_DIR:-/data/uploads}"
chown node:node "${UPLOAD_DIR:-/data/uploads}"
exec gosu node "$@"
