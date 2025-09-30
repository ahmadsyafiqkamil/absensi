#!/bin/bash

# Script to switch between development and production environments

ENV=${1:-dev}

case $ENV in
  "dev"|"development")
    echo "🚀 Starting Development Environment..."
    echo "   - Backend URL: http://localhost:8000 (client) / http://backend:8000 (server)"
    echo "   - Frontend URL: http://localhost:3000"
    echo ""
    docker-compose -f docker-compose.dev.yml up -d
    ;;
  "prod"|"production")
    echo "🏭 Starting Production Environment..."
    echo "   - Backend URL: https://api.siaki.kjri-dubai.local"
    echo "   - Frontend URL: https://siaki.kjri-dubai.local"
    echo ""
    echo "⚠️  Make sure you have:"
    echo "   1. production.env file configured"
    echo "   2. SSL certificates for the domain"
    echo "   3. Domain DNS pointing to your server"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose -f docker-compose.prod.yml up -d
    else
      echo "❌ Production startup cancelled"
      exit 1
    fi
    ;;
  *)
    echo "❌ Invalid environment. Use 'dev' or 'prod'"
    echo ""
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "Examples:"
    echo "  $0 dev     # Start development environment"
    echo "  $0 prod    # Start production environment"
    exit 1
    ;;
esac

echo ""
echo "✅ Environment started successfully!"
echo ""
echo "To check status:"
echo "  docker ps"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.${ENV}.yml logs -f"

