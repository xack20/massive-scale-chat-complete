#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if setup was run
check_setup() {
    if [ ! -f .env ]; then
        print_warning "No .env file found. Running setup first..."
        ./setup.sh
    fi
}

# Determine Docker Compose command
get_compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    elif docker-compose --version &> /dev/null; then
        echo "docker-compose"
    else
        print_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
}

# Start infrastructure services
start_infrastructure() {
    print_info "Starting infrastructure services..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd up -d postgresql mongodb redis zookeeper kafka minio

    print_info "Waiting for infrastructure to be ready..."
    sleep 20

    print_success "Infrastructure services started"
}

# Start application services
start_services() {
    print_info "Starting application services..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd up -d api-gateway user-service message-service file-service notification-service presence-service

    print_info "Waiting for services to be ready..."
    sleep 10

    print_success "Application services started"
}

# Start frontend and load balancer
start_frontend() {
    print_info "Starting frontend and load balancer..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd up -d haproxy frontend

    print_success "Frontend and load balancer started"
}

# Show service status
show_status() {
    print_info "Checking service status..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd ps

    echo ""
    print_info "Service URLs:"
    echo -e "• ${GREEN}Frontend:${NC} http://localhost:3006"
    echo -e "• ${GREEN}API Gateway:${NC} http://localhost/api"
    echo -e "• ${GREEN}HAProxy Stats:${NC} http://localhost:8080"
    echo -e "• ${GREEN}MinIO Console:${NC} http://localhost:9001"
    echo -e ""
    echo -e "• ${YELLOW}PostgreSQL:${NC} localhost:5432"
    echo -e "• ${YELLOW}MongoDB:${NC} localhost:27017"
    echo -e "• ${YELLOW}Redis:${NC} localhost:6379"
    echo -e "• ${YELLOW}Kafka:${NC} localhost:9092"
}

# Show logs
show_logs() {
    print_info "Showing recent logs (press Ctrl+C to exit)..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd logs -f --tail=100
}

# Stop all services
stop_services() {
    print_info "Stopping all services..."
    local compose_cmd=$(get_compose_cmd)

    $compose_cmd down
    print_success "All services stopped"
}

# Restart services
restart_services() {
    print_info "Restarting services..."
    stop_services
    sleep 2
    main start
}

# Clean up everything
cleanup() {
    print_warning "This will remove all containers, volumes, and data. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up..."
        local compose_cmd=$(get_compose_cmd)

        $compose_cmd down -v --remove-orphans
        docker network rm chat-network 2>/dev/null || true

        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

# Health check
health_check() {
    print_info "Running health checks..."
    local compose_cmd=$(get_compose_cmd)

    # Check if containers are running
    running_containers=$($compose_cmd ps --services --filter "status=running" | wc -l)
    total_containers=$($compose_cmd ps --services | wc -l)

    echo -e "Running containers: ${GREEN}$running_containers${NC}/${BLUE}$total_containers${NC}"

    # Check specific services
    services=("postgresql" "mongodb" "redis" "kafka" "api-gateway" "frontend")

    for service in "${services[@]}"; do
        if $compose_cmd ps "$service" | grep -q "Up"; then
            echo -e "• $service: ${GREEN}✅ Running${NC}"
        else
            echo -e "• $service: ${RED}❌ Not running${NC}"
        fi
    done
}

# Show help
show_help() {
    echo -e "${BLUE}Massive Scale Chat - Development Environment${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC} ./start-dev.sh [command]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}      Start all services (default)"
    echo -e "  ${GREEN}stop${NC}       Stop all services"
    echo -e "  ${GREEN}restart${NC}    Restart all services"
    echo -e "  ${GREEN}status${NC}     Show service status and URLs"
    echo -e "  ${GREEN}logs${NC}       Show service logs"
    echo -e "  ${GREEN}health${NC}     Run health checks"
    echo -e "  ${GREEN}cleanup${NC}    Remove all containers and volumes"
    echo -e "  ${GREEN}help${NC}       Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ./start-dev.sh                # Start all services"
    echo -e "  ./start-dev.sh status         # Check status"
    echo -e "  ./start-dev.sh logs           # View logs"
}

# Main function
main() {
    local command=${1:-start}

    case $command in
        start)
            print_header "Starting Massive Scale Chat Development Environment"
            check_setup
            start_infrastructure
            start_services
            start_frontend
            show_status
            print_header "🚀 Development Environment Ready!"
            print_info "Run './start-dev.sh logs' to view logs"
            print_info "Run './start-dev.sh status' to check service status"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Script interrupted by user${NC}"; exit 0' INT

# Run main function
main "$@"
