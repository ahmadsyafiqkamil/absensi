#!/bin/bash

# Production Management Script for Absensi
# This script provides various management commands for the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Function to check if production environment is running
check_production_running() {
    if ! docker-compose --env-file production.env -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Production environment is not running!"
        print_info "Start it with: ./docker-prod.sh"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "🚀 Absensi Production Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status          Show status of all services"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  restart [service] Restart services (optionally specific service)"
    echo "  backup          Create database backup"
    echo "  restore <file>  Restore database from backup"
    echo "  migrate         Run database migrations"
    echo "  collectstatic   Collect static files"
    echo "  createsuperuser Create Django superuser"
    echo "  shell           Open Django shell"
    echo "  dbshell         Open database shell"
    echo "  health          Check health of all services"
    echo "  update          Update all services"
    echo "  clean           Clean up unused Docker resources"
    echo "  monitor         Show real-time monitoring"
    echo "  ssl             Check SSL certificate status"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs backend"
    echo "  $0 restart frontend"
    echo "  $0 backup"
    echo "  $0 restore backup_20240101_120000.sql.gz"
}

# Function to show status
show_status() {
    print_info "Production Environment Status"
    echo ""
    docker-compose --env-file production.env -f docker-compose.prod.yml ps
    echo ""
    print_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Function to show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_info "Showing logs for all services..."
        docker-compose --env-file production.env -f docker-compose.prod.yml logs -f
    else
        print_info "Showing logs for $service..."
        docker-compose --env-file production.env -f docker-compose.prod.yml logs -f "$service"
    fi
}

# Function to restart services
restart_services() {
    local service=$1
    if [ -z "$service" ]; then
        print_info "Restarting all services..."
        docker-compose --env-file production.env -f docker-compose.prod.yml restart
    else
        print_info "Restarting $service..."
        docker-compose --env-file production.env -f docker-compose.prod.yml restart "$service"
    fi
    print_status "Restart completed"
}

# Function to create backup
create_backup() {
    print_info "Creating database backup..."
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backup_${timestamp}.sql.gz"
    
    docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} absensi_db | gzip > "./backups/${backup_file}"
    
    print_status "Backup created: ./backups/${backup_file}"
    print_info "Backup size: $(du -h "./backups/${backup_file}" | cut -f1)"
}

# Function to restore backup
restore_backup() {
    local backup_file=$1
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file"
        print_info "Available backups:"
        ls -la ./backups/
        exit 1
    fi
    
    if [ ! -f "./backups/$backup_file" ]; then
        print_error "Backup file not found: ./backups/$backup_file"
        exit 1
    fi
    
    print_warning "This will replace the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restore cancelled"
        exit 1
    fi
    
    print_info "Restoring from $backup_file..."
    if [[ $backup_file == *.gz ]]; then
        gunzip -c "./backups/$backup_file" | docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} absensi_db
    else
        docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} absensi_db < "./backups/$backup_file"
    fi
    
    print_status "Database restored successfully"
}

# Function to run migrations
run_migrations() {
    print_info "Running database migrations..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
    print_status "Migrations completed"
}

# Function to collect static files
collect_static() {
    print_info "Collecting static files..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
    print_status "Static files collected"
}

# Function to create superuser
create_superuser() {
    print_info "Creating Django superuser..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec backend python manage.py createsuperuser
    print_status "Superuser created"
}

# Function to open Django shell
open_shell() {
    print_info "Opening Django shell..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec backend python manage.py shell
}

# Function to open database shell
open_dbshell() {
    print_info "Opening database shell..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} absensi_db
}

# Function to check health
check_health() {
    print_info "Checking service health..."
    echo ""
    
    # Check backend
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        print_status "Backend: Healthy"
    else
        print_error "Backend: Unhealthy"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend: Healthy"
    else
        print_error "Frontend: Unhealthy"
    fi
    
    # Check database
    if docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent; then
        print_status "Database: Healthy"
    else
        print_error "Database: Unhealthy"
    fi
}

# Function to update services
update_services() {
    print_info "Updating all services..."
    docker-compose --env-file production.env -f docker-compose.prod.yml pull
    docker-compose --env-file production.env -f docker-compose.prod.yml up -d
    print_status "Services updated"
}

# Function to clean up
clean_up() {
    print_info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_status "Cleanup completed"
}

# Function to show monitoring
show_monitoring() {
    print_info "Real-time monitoring (Press Ctrl+C to exit)..."
    watch -n 2 'docker-compose --env-file production.env -f docker-compose.prod.yml ps && echo "" && docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"'
}

# Function to check SSL
check_ssl() {
    print_info "Checking SSL certificate status..."
    if [ -n "$FRONTEND_DOMAIN" ] && [ -n "$API_DOMAIN" ]; then
        echo "Frontend SSL:"
        echo | openssl s_client -servername "$FRONTEND_DOMAIN" -connect "$FRONTEND_DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates
        echo ""
        echo "API SSL:"
        echo | openssl s_client -servername "$API_DOMAIN" -connect "$API_DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates
    else
        print_warning "Domain variables not set in production.env"
    fi
}

# Main script logic
case "${1:-help}" in
    status)
        check_production_running
        show_status
        ;;
    logs)
        check_production_running
        show_logs "$2"
        ;;
    restart)
        check_production_running
        restart_services "$2"
        ;;
    backup)
        check_production_running
        create_backup
        ;;
    restore)
        check_production_running
        restore_backup "$2"
        ;;
    migrate)
        check_production_running
        run_migrations
        ;;
    collectstatic)
        check_production_running
        collect_static
        ;;
    createsuperuser)
        check_production_running
        create_superuser
        ;;
    shell)
        check_production_running
        open_shell
        ;;
    dbshell)
        check_production_running
        open_dbshell
        ;;
    health)
        check_production_running
        check_health
        ;;
    update)
        check_production_running
        update_services
        ;;
    clean)
        clean_up
        ;;
    monitor)
        check_production_running
        show_monitoring
        ;;
    ssl)
        check_production_running
        check_ssl
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
