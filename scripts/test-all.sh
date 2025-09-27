#!/bin/bash

echo "Running tests for all services..."

# Test each service
for service in services/*; do
  if [ -f "$service/package.json" ]; then
    echo "Testing $(basename $service)..."
    (cd $service && npm test)
  fi
done

# Test frontend
echo "Testing frontend..."
(cd frontend && npm test)

echo "All tests complete!"
