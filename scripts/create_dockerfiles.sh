#!/bin/bash

echo "Creating Dockerfiles for all services..."

# API Gateway Dockerfile
cat > services/api-gateway/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
EOF

# User Service Dockerfile
cat > services/user-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
EXPOSE 3001
CMD ["npm", "start"]
EOF

# Message Service Dockerfile
cat > services/message-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["npm", "start"]
EOF

# File Service Dockerfile
cat > services/file-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3003
CMD ["npm", "start"]
EOF

# Notification Service Dockerfile
cat > services/notification-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3004
CMD ["npm", "start"]
EOF

# Presence Service Dockerfile
cat > services/presence-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3005
CMD ["npm", "start"]
EOF

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
EXPOSE 3006
CMD ["npm", "start"]
EOF

# HAProxy configuration
cat > infrastructure/haproxy/haproxy.cfg << 'EOF'
global
    maxconn 4096
    log stdout local0
    log stdout local1 notice

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    log global

frontend http_front
    bind *:80
    stats uri /haproxy?stats
    
    # ACL for different services
    acl is_api path_beg /api
    acl is_ws path_beg /ws
    
    # Route to appropriate backend
    use_backend api_backend if is_api
    use_backend ws_backend if is_ws
    default_backend frontend_backend

backend api_backend
    balance roundrobin
    server api1 api-gateway:3000 check

backend ws_backend
    balance source
    server presence1 presence-service:3005 check

backend frontend_backend
    server frontend1 frontend:3006 check

listen stats
    bind *:8080
    stats enable
    stats uri /
    stats refresh 30s
EOF

# Create .dockerignore files
for service in services/*; do
  cat > $service/.dockerignore << 'EOF'
node_modules
dist
.env
*.log
.DS_Store
coverage
.nyc_output
EOF
done

cat > frontend/.dockerignore << 'EOF'
node_modules
.next
.env.local
*.log
.DS_Store
coverage
EOF

# Create build script
cat > scripts/build-all.sh << 'EOF'
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
EOF

chmod +x scripts/build-all.sh

# Create test script
cat > scripts/test-all.sh << 'EOF'
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
EOF

chmod +x scripts/test-all.sh

echo "Dockerfiles and scripts created successfully!"