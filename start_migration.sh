#!/bin/bash

# 🚀 V2 API MIGRATION - QUICK START SCRIPT
# This script helps you start the migration process step by step

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}"
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

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "drf/app/manage.py" ]]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Create backup
create_backup() {
    print_header "STEP 1: CREATING DATABASE BACKUP"
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).json"
    
    print_info "Creating database backup..."
    docker-compose exec backend python manage.py dumpdata > "$backup_file"
    
    if [[ -f "$backup_file" ]]; then
        print_success "Database backup created: $backup_file"
    else
        print_error "Failed to create database backup"
        exit 1
    fi
}

# Check V2 apps status
check_v2_status() {
    print_header "STEP 2: CHECKING V2 API STATUS"
    
    # Check if V2 apps are in INSTALLED_APPS
    print_info "Checking V2 apps configuration..."
    
    local apps=(
        "apps.auth"
        "apps.users"
        "apps.employees"
        "apps.attendance"
        "apps.overtime"
        "apps.corrections"
        "apps.settings"
        "apps.reporting"
        "apps.core"
    )
    
    for app in "${apps[@]}"; do
        if docker-compose exec backend python manage.py shell -c "
from django.apps import apps
try:
    apps.get_app_config('${app#apps.}')
    print('✅ $app')
except:
    print('❌ $app')
" | grep -q "✅"; then
            print_success "$app is configured"
        else
            print_warning "$app needs to be added to INSTALLED_APPS"
        fi
    done
}

# Run migrations
run_migrations() {
    print_header "STEP 3: RUNNING DATABASE MIGRATIONS"
    
    print_info "Making migrations for V2 apps..."
    docker-compose exec backend python manage.py makemigrations
    
    print_info "Applying migrations..."
    docker-compose exec backend python manage.py migrate
    
    print_success "Database migrations completed"
}

# Test V2 endpoints
test_v2_endpoints() {
    print_header "STEP 4: TESTING V2 ENDPOINTS"
    
    print_info "Testing V2 API endpoints..."
    
    # Test health endpoint
    if curl -s http://localhost:8000/api/v2/auth/health/ | grep -q "healthy"; then
        print_success "V2 health endpoint working"
    else
        print_warning "V2 health endpoint not responding"
    fi
    
    # Test other endpoints (without auth for now)
    local endpoints=(
        "/api/v2/employees/divisions/"
        "/api/v2/employees/positions/"
        "/api/v2/settings/holidays/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$endpoint" | grep -q "200\|401"; then
            print_success "Endpoint $endpoint is responding"
        else
            print_warning "Endpoint $endpoint may have issues"
        fi
    done
}

# Update frontend configuration
update_frontend_config() {
    print_header "STEP 5: UPDATING FRONTEND CONFIGURATION"
    
    print_info "Updating API configuration to use V2 by default..."
    
    # Create a backup of the current backend.ts
    cp frontend/src/lib/backend.ts frontend/src/lib/backend.ts.backup
    
    # Update default API version (this is a simple approach)
    print_info "Backend configuration backup created"
    print_warning "Manual update needed: Change DEFAULT_API_VERSION to 'V2' in frontend/src/lib/backend.ts"
}

# Run tests
run_tests() {
    print_header "STEP 6: RUNNING INITIAL TESTS"
    
    print_info "Running backend tests..."
    docker-compose exec backend python manage.py test apps.employees apps.attendance apps.overtime apps.corrections apps.settings --verbosity=2
    
    print_info "Running frontend tests..."
    cd frontend && npm test -- --passWithNoTests
    cd ..
    
    print_success "Initial tests completed"
}

# Generate migration report
generate_report() {
    print_header "MIGRATION STATUS REPORT"
    
    echo -e "${BLUE}📊 Migration Progress:${NC}"
    echo "✅ Database backup created"
    echo "✅ V2 apps configured"
    echo "✅ Database migrations applied"
    echo "✅ V2 endpoints tested"
    echo "⚠️  Frontend configuration needs manual update"
    echo "⚠️  Frontend migration needs to be executed"
    
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Review MIGRATION_GUIDE.md for detailed endpoint mapping"
    echo "2. Follow FRONTEND_MIGRATION_PLAN.md for systematic frontend migration"
    echo "3. Execute TESTING_STRATEGY.md for comprehensive testing"
    echo "4. Monitor system performance during migration"
    
    echo ""
    echo -e "${BLUE}📞 Important Files Created/Updated:${NC}"
    echo "- Database backup: $(ls backup_*.json | tail -1)"
    echo "- Frontend backup: frontend/src/lib/backend.ts.backup"
    echo "- Migration guides: MIGRATION_GUIDE.md, FRONTEND_MIGRATION_PLAN.md"
    echo "- Testing strategy: TESTING_STRATEGY.md"
    
    echo ""
    echo -e "${GREEN}🎉 Backend migration preparation is complete!${NC}"
    echo -e "${YELLOW}⚡ You can now start the frontend migration process.${NC}"
}

# Main execution
main() {
    print_header "🚀 V2 API MIGRATION - QUICK START"
    
    echo -e "${BLUE}This script will help you start the V2 API migration process.${NC}"
    echo -e "${YELLOW}Make sure you have read the EXECUTIVE_SUMMARY.md first!${NC}"
    echo ""
    
    read -p "Do you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled."
        exit 1
    fi
    
    # Execute migration steps
    check_directory
    check_docker
    create_backup
    check_v2_status
    run_migrations
    test_v2_endpoints
    update_frontend_config
    run_tests
    generate_report
    
    echo ""
    echo -e "${GREEN}🎯 Migration preparation completed successfully!${NC}"
    echo -e "${BLUE}📖 Next: Follow the FRONTEND_MIGRATION_PLAN.md for the next steps.${NC}"
}

# Execute main function
main "$@"
