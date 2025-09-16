#!/bin/bash

# Quick Production Start Script for Absensi
# This script provides quick commands for common production tasks

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to show help
show_help() {
    echo "🚀 Absensi Production Quick Commands"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Quick Commands:"
    echo "  start            Start production environment"
    echo "  stop             Stop production environment"
    echo "  restart          Restart production environment"
    echo "  status           Show status"
    echo "  logs             Show logs"
    echo "  health           Check health"
    echo "  backup           Create backup"
    echo "  update           Update and restart"
    echo "  clean            Clean up resources"
    echo "  help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs backend"
}

# Function to start production
start_production() {
    print_info "Starting production environment..."
    ./docker-prod.sh
}

# Function to stop production
stop_production() {
    print_info "Stopping production environment..."
    docker-compose --env-file production.env -f docker-compose.prod.yml down
    print_status "Production environment stopped"
}

# Function to restart production
restart_production() {
    print_info "Restarting production environment..."
    docker-compose --env-file production.env -f docker-compose.prod.yml restart
    print_status "Production environment restarted"
}

# Function to show status
show_status() {
    print_info "Production Environment Status"
    docker-compose --env-file production.env -f docker-compose.prod.yml ps
}

# Function to show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose --env-file production.env -f docker-compose.prod.yml logs -f
    else
        docker-compose --env-file production.env -f docker-compose.prod.yml logs -f "$service"
    fi
}

# Function to check health
check_health() {
    print_info "Checking health..."
    ./docker-prod-manage.sh health
}

# Function to create backup
create_backup() {
    print_info "Creating backup..."
    ./docker-prod-manage.sh backup
}

# Function to update
update_production() {
    print_info "Updating production environment..."
    ./docker-prod-manage.sh update
}

# Function to clean up
clean_up() {
    print_info "Cleaning up..."
    ./docker-prod-manage.sh clean
}

# Main script logic
case "${1:-help}" in
    start)
        start_production
        ;;
    stop)
        stop_production
        ;;
    restart)
        restart_production
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    health)
        check_health
        ;;
    backup)
        create_backup
        ;;
    update)
        update_production
        ;;
    clean)
        clean_up
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_warning "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
