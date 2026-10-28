#!/usr/bin/env bash
set -eu
npm ci
npm run setup:test
docker compose up -d --wait
npm run db:setup
npm test
printf '%s\n' 'Tayyor: npm run dev:test'
