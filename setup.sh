#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed and running
check_docker() {
    print_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
    fi

    print_success "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_info "Checking Docker Compose..."
    if ! docker compose version &> /dev/null; then
        if ! docker-compose --version &> /dev/null; then
            print_error "Docker Compose is not available. Please install Docker Compose."
        else
            COMPOSE_CMD="docker-compose"
        fi
    else
        COMPOSE_CMD="docker compose"
    fi
    print_success "Docker Compose is available"
}

# Check if Node.js is installed
check_node() {
    print_info "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Some features may not work for local development."
        return
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_warning "Node.js version 18 or higher is recommended. Current version: $(node --version)"
    else
        print_success "Node.js $(node --version) is installed"
    fi
}

# Create environment file
create_env_file() {
    print_info "Setting up environment file..."
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please review and update the .env file with your configuration"
    else
        print_warning ".env file already exists. Skipping creation."
    fi
}

# Setup frontend environment
setup_frontend_env() {
    print_info "Setting up frontend environment..."
    if [ ! -f frontend/.env.local ]; then
        cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/ws
NEXT_PUBLIC_FILE_UPLOAD_URL=http://localhost/api/files
EOF
        print_success "Created frontend/.env.local"
    else
        print_warning "frontend/.env.local already exists. Skipping creation."
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."

    if command -v npm &> /dev/null; then
        npm install
        print_success "Root dependencies installed"

        # Install frontend dependencies
        cd frontend && npm install && cd ..
        print_success "Frontend dependencies installed"

        # Install service dependencies
        for service in services/*/; do
            if [ -f "${service}package.json" ]; then
                service_name=$(basename "$service")
                print_info "Installing dependencies for $service_name..."
                cd "$service" && npm install && cd ../..
                print_success "$service_name dependencies installed"
            fi
        done
    else
        print_warning "npm not available. Skipping dependency installation."
        print_info "You can install dependencies later by running 'npm install' in each directory."
    fi
}

# Create Docker networks and volumes
setup_docker() {
    print_info "Setting up Docker networks and volumes..."

    # Create custom network if it doesn't exist
    if ! docker network ls | grep -q chat-network; then
        docker network create chat-network
        print_success "Created Docker network: chat-network"
    else
        print_info "Docker network chat-network already exists"
    fi

    # Create volumes
    docker volume create postgres_data 2>/dev/null || true
    docker volume create mongo_data 2>/dev/null || true
    docker volume create redis_data 2>/dev/null || true
    docker volume create minio_data 2>/dev/null || true

    print_success "Docker volumes created"
}

# Initialize databases
init_databases() {
    print_info "Starting database containers..."

    # Start only infrastructure services first
    $COMPOSE_CMD up -d postgresql mongodb redis zookeeper kafka minio

    print_info "Waiting for databases to be ready..."
    sleep 30

    # Check if services are healthy
    print_info "Checking database connectivity..."

    # Test PostgreSQL
    if docker exec massive-scale-chat-postgresql-1 pg_isready -U chatuser 2>/dev/null; then
        print_success "PostgreSQL is ready"
    else
        print_warning "PostgreSQL might not be fully ready yet"
    fi

    # Test MongoDB
    if docker exec massive-scale-chat-mongodb-1 mongo --quiet --eval "db.adminCommand('ismaster')" 2>/dev/null; then
        print_success "MongoDB is ready"
    else
        print_warning "MongoDB might not be fully ready yet"
    fi

    # Test Redis
    if docker exec massive-scale-chat-redis-1 redis-cli -a chatpass123 ping 2>/dev/null | grep -q PONG; then
        print_success "Redis is ready"
    else
        print_warning "Redis might not be fully ready yet"
    fi
}

# Create Kafka topics
setup_kafka_topics() {
    print_info "Setting up Kafka topics..."
    sleep 10  # Wait a bit more for Kafka

    # Create topics
    topics=("messages" "notifications" "presence" "file-uploads" "user-events")

    for topic in "${topics[@]}"; do
        docker exec massive-scale-chat-kafka-1 kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic "$topic" --partitions 3 --replication-factor 1 2>/dev/null || true
        print_success "Created Kafka topic: $topic"
    done
}

# Setup MinIO buckets
setup_minio() {
    print_info "Setting up MinIO buckets..."
    sleep 5

    # Create bucket using MinIO client
    docker exec massive-scale-chat-minio-1 mc alias set local http://localhost:9000 minioadmin minioadmin123 2>/dev/null || true
    docker exec massive-scale-chat-minio-1 mc mb local/chat-files 2>/dev/null || true
    docker exec massive-scale-chat-minio-1 mc policy set public local/chat-files 2>/dev/null || true

    print_success "MinIO bucket 'chat-files' created and configured"
}

# Verify setup
verify_setup() {
    print_info "Verifying setup..."

    # Check if all containers are running
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_success "Docker containers are running"
    else
        print_warning "Some containers might not be running properly"
    fi

    print_info "Setup verification complete!"
}

# Main setup process
main() {
    print_header "Massive Scale Chat - Setup Script"

    print_info "Starting setup process..."

    check_docker
    check_docker_compose  
    check_node
    create_env_file
    setup_frontend_env

    if command -v npm &> /dev/null; then
        install_dependencies
    fi

    setup_docker
    init_databases
    setup_kafka_topics
    setup_minio
    verify_setup

    print_header "Setup Complete! 🎉"

    echo -e "${GREEN}Next steps:${NC}"
    echo -e "1. Review and update the .env file with your configuration"
    echo -e "2. Run 'npm run dev' or './start-dev.sh' to start the development environment"
    echo -e "3. Visit http://localhost:3006 to access the application"
    echo -e ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "• ${YELLOW}npm run docker:up${NC}     - Start all containers"
    echo -e "• ${YELLOW}npm run docker:down${NC}   - Stop all containers" 
    echo -e "• ${YELLOW}npm run docker:logs${NC}   - View container logs"
    echo -e "• ${YELLOW}./start-dev.sh${NC}        - Start development mode"
    echo -e ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Run main function
main "$@"
