#!/bin/bash

echo "Building all services..."

# Build each service
for service in services/*; do
  if [ -f "$service/package.json" ]; then
    echo "Building $(basename $service)..."
    (cd $service && npm run build)
  fi
done

# Build frontend
echo "Building frontend..."
(cd frontend && npm run build)

echo "Build complete!"
