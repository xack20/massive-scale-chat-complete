#!/bin/bash

echo "======================================"
echo "COMPREHENSIVE PROJECT REVIEW"
echo "======================================"
echo ""

# Function to check if file has actual implementation
check_file_content() {
    local file=$1
    local size=$(wc -c < "$file" 2>/dev/null)
    
    if [ ! -f "$file" ]; then
        echo "❌ MISSING: $file"
        return 1
    elif [ "$size" -lt 100 ]; then
        echo "⚠️  STUB/EMPTY: $file (${size} bytes)"
        return 1
    else
        return 0
    fi
}

echo "1. CHECKING CRITICAL CONFIGURATION FILES"
echo "-----------------------------------------"
files=(
    ".env.example"
    "docker-compose.yml"
    "docker-compose.prod.yml"
    "package.json"
    ".gitignore"
)
for file in "${files[@]}"; do
    check_file_content "$file" || true
done

echo ""
echo "2. CHECKING SERVICE IMPLEMENTATIONS"
echo "------------------------------------"

services=(
    "api-gateway"
    "user-service"
    "message-service"
    "file-service"
    "notification-service"
    "presence-service"
)

for service in "${services[@]}"; do
    echo ""
    echo "Service: $service"
    echo "........................"
    
    # Check critical files for each service
    critical_files=(
        "services/$service/package.json"
        "services/$service/tsconfig.json"
        "services/$service/Dockerfile"
        "services/$service/src/index.ts"
    )
    
    for file in "${critical_files[@]}"; do
        check_file_content "$file" || true
    done
    
    # Check for controllers, routes, middleware
    if [ -d "services/$service/src" ]; then
        controller_count=$(find "services/$service/src" -name "*controller*" -o -name "*Controller*" 2>/dev/null | wc -l)
        route_count=$(find "services/$service/src" -name "*route*" -o -name "*Route*" 2>/dev/null | wc -l)
        echo "  Controllers found: $controller_count"
        echo "  Routes found: $route_count"
    fi
done

echo ""
echo "3. CHECKING FRONTEND IMPLEMENTATION"
echo "------------------------------------"
frontend_files=(
    "frontend/package.json"
    "frontend/tsconfig.json"
    "frontend/next.config.js"
    "frontend/tailwind.config.js"
    "frontend/Dockerfile"
    "frontend/src/app/layout.tsx"
    "frontend/src/app/page.tsx"
    "frontend/src/app/login/page.tsx"
    "frontend/src/app/register/page.tsx"
    "frontend/src/app/chat/page.tsx"
)

for file in "${frontend_files[@]}"; do
    check_file_content "$file" || true
done

echo ""
echo "  Frontend Components:"
components=$(find frontend/src/components -name "*.tsx" 2>/dev/null | wc -l)
echo "  Total components: $components"

echo ""
echo "4. CHECKING DATABASE SCHEMAS"
echo "-----------------------------"
# Check Prisma schemas
if [ -f "services/api-gateway/prisma/schema.prisma" ]; then
    echo "✓ API Gateway Prisma schema exists"
    models=$(grep -c "^model " services/api-gateway/prisma/schema.prisma 2>/dev/null || echo 0)
    echo "  Models defined: $models"
fi

if [ -f "services/user-service/prisma/schema.prisma" ]; then
    echo "✓ User Service Prisma schema exists"
    models=$(grep -c "^model " services/user-service/prisma/schema.prisma 2>/dev/null || echo 0)
    echo "  Models defined: $models"
fi

# Check MongoDB models
if [ -d "services/message-service/src/models" ]; then
    mongo_models=$(find services/message-service/src/models -name "*.ts" 2>/dev/null | wc -l)
    echo "✓ Message Service MongoDB models: $mongo_models"
fi

echo ""
echo "5. CHECKING KUBERNETES CONFIGURATIONS"
echo "--------------------------------------"
k8s_files=$(find infrastructure/kubernetes -name "*.yaml" -o -name "*.yml" 2>/dev/null | wc -l)
echo "Kubernetes manifests found: $k8s_files"

echo ""
echo "6. CHECKING DOCUMENTATION"
echo "--------------------------"
docs=(
    "README.md"
    "docs/API.md"
    "docs/ARCHITECTURE.md"
    "docs/DEPLOYMENT.md"
    "docs/CONTRIBUTING.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        size=$(wc -l < "$doc")
        if [ "$size" -gt 10 ]; then
            echo "✓ $doc ($size lines)"
        else
            echo "⚠️  $doc (only $size lines)"
        fi
    else
        echo "❌ MISSING: $doc"
    fi
done

echo ""
echo "7. CHECKING TEST COVERAGE"
echo "-------------------------"
test_files=$(find tests/e2e -name "*.spec.ts" 2>/dev/null | wc -l)
echo "E2E test files: $test_files"

if [ -f "playwright.config.ts" ]; then
    echo "✓ Playwright config exists"
fi

echo ""
echo "8. CHECKING FOR COMMON ISSUES"
echo "------------------------------"
# Check for TODO comments
todos=$(grep -r "TODO" --include="*.ts" --include="*.tsx" --include="*.js" services frontend 2>/dev/null | wc -l)
echo "TODO comments found: $todos"

# Check for console.log statements
console_logs=$(grep -r "console.log" --include="*.ts" --include="*.tsx" services frontend 2>/dev/null | wc -l)
echo "console.log statements: $console_logs"

echo ""
echo "9. CHECKING ENVIRONMENT VARIABLES"
echo "----------------------------------"
if [ -f ".env.example" ]; then
    env_vars=$(grep -c "^[A-Z]" .env.example 2>/dev/null || echo 0)
    echo "Environment variables defined: $env_vars"
    
    # Check for critical variables
    critical_vars=(
        "DATABASE_URL"
        "MONGODB_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "KAFKA_BROKERS"
    )
    
    for var in "${critical_vars[@]}"; do
        if grep -q "^$var=" .env.example 2>/dev/null; then
            echo "✓ $var defined"
        else
            echo "❌ $var missing"
        fi
    done
fi

echo ""
echo "10. FILE STATISTICS"
echo "--------------------"
ts_files=$(find . -name "*.ts" -o -name "*.tsx" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l)
js_files=$(find . -name "*.js" -o -name "*.jsx" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l)
json_files=$(find . -name "*.json" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l)
docker_files=$(find . -name "Dockerfile*" 2>/dev/null | wc -l)

echo "TypeScript files: $ts_files"
echo "JavaScript files: $js_files"
echo "JSON files: $json_files"
echo "Dockerfiles: $docker_files"

echo ""
echo "======================================"
echo "REVIEW COMPLETE"
echo "======================================"