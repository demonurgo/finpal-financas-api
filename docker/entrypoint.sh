#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Running Prisma seed..."
npx prisma db seed

echo "Starting Finpal API..."
exec node dist/src/main.js
