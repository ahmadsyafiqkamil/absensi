#!/bin/bash

# Production Monitoring Script
# Usage: ./scripts/monitor.sh [check_type]
# Check types: all, health, logs, resources, security

set -e

CHECK_TYPE=${1:-all}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check service health
check_health() {
    log_info "Checking service health..."

    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    source "$ENV_FILE"

    echo ""
    echo "=== Service Health Status ==="

    # Database health
    if docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "✅ Database: Healthy"
    else
        echo "❌ Database: Unhealthy"
    fi

    # Backend health
    if curl -f -s "http://localhost:8000/health/" > /dev/null 2>&1; then
        echo "✅ Backend: Healthy"
        # Get response time
        RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:8000/health/")
        echo "   Response time: ${RESPONSE_TIME}s"
    else
        echo "❌ Backend: Unhealthy"
    fi

    # Frontend health
    if curl -f -s "http://localhost:3000" > /dev/null 2>&1; then
        echo "✅ Frontend: Healthy"
        # Get response time
        RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:3000")
        echo "   Response time: ${RESPONSE_TIME}s"
    else
        echo "❌ Frontend: Unhealthy"
    fi

    # Caddy health
    if curl -f -s "http://localhost:2019/config/" > /dev/null 2>&1; then
        echo "✅ Caddy: Healthy"
    else
        echo "❌ Caddy: Unhealthy"
    fi
}

# Function to check resources
check_resources() {
    log_info "Checking resource usage..."

    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" $(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q)

    echo ""
    echo "=== Disk Usage ==="
    df -h | grep -E "(Filesystem|/$|docker)"

    echo ""
    echo "=== Docker System Info ==="
    docker system df
}

# Function to check logs
check_logs() {
    log_info "Checking recent logs..."

    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    echo ""
    echo "=== Recent Application Logs ==="

    echo "Backend logs (last 20 lines):"
    echo "--------------------------------"
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=20 backend 2>/dev/null || echo "No backend logs available"

    echo ""
    echo "Frontend logs (last 20 lines):"
    echo "--------------------------------"
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=20 frontend 2>/dev/null || echo "No frontend logs available"

    echo ""
    echo "Database logs (last 20 lines):"
    echo "--------------------------------"
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=20 mysql 2>/dev/null || echo "No database logs available"
}

# Function to check security
check_security() {
    log_info "Checking security status..."

    echo ""
    echo "=== Security Audit ==="

    # Check for exposed ports
    echo "Exposed ports:"
    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format "table {{.Names}}\t{{.Ports}}"

    echo ""
    echo "Security recommendations:"
    echo "- Ensure database port (3306) is not exposed publicly"
    echo "- Verify SSL/TLS certificates are valid"
    echo "- Check that sensitive environment variables are not logged"
    echo "- Ensure file permissions are correct"

    # Check SSL certificates
    echo ""
    echo "SSL Certificate status:"
    if command -v openssl >/dev/null 2>&1; then
        source "$ENV_FILE"
        echo "Frontend certificate:"
        echo | openssl s_client -connect "${FRONTEND_DOMAIN}:443" -servername "${FRONTEND_DOMAIN}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "Certificate check failed"

        echo ""
        echo "API certificate:"
        echo | openssl s_client -connect "${API_DOMAIN}:443" -servername "${API_DOMAIN}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "Certificate check failed"
    else
        echo "OpenSSL not available for certificate checking"
    fi
}

# Function to generate report
generate_report() {
    log_info "Generating monitoring report..."

    REPORT_FILE="${PROJECT_ROOT}/reports/monitoring_$(date +%Y%m%d_%H%M%S).txt"

    mkdir -p "${PROJECT_ROOT}/reports"

    {
        echo "=== Absensi System Monitoring Report ==="
        echo "Generated: $(date)"
        echo ""

        echo "=== Service Status ==="
        ENV_FILE="${PROJECT_ROOT}/production.env"
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
        docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

        echo ""
        echo "=== Resource Usage ==="
        docker stats --no-stream $(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q)

        echo ""
        echo "=== Disk Usage ==="
        df -h

        echo ""
        echo "=== Recent Errors (last 50 lines) ==="
        docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=50 2>&1 | grep -i error || echo "No recent errors found"

    } > "$REPORT_FILE"

    log_success "Report generated: $REPORT_FILE"
}

# Main execution
case $CHECK_TYPE in
    health)
        check_health
        ;;
    resources)
        check_resources
        ;;
    logs)
        check_logs
        ;;
    security)
        check_security
        ;;
    report)
        generate_report
        ;;
    all)
        check_health
        check_resources
        check_logs
        check_security
        ;;
    *)
        echo "Usage: $0 [check_type]"
        echo "Check types: all, health, resources, logs, security, report"
        exit 1
        ;;
esac
