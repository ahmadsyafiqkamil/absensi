#!/bin/bash

# Script to create admin user in Docker environment
# Usage: ./create_admin_user.sh [username] [email] [password]

echo "Creating admin user..."

# Default values
USERNAME=${1:-admin}
EMAIL=${2:-admin@example.com}
PASSWORD=${3:-1}

echo "Username: $USERNAME"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"

# Run the script inside Docker container
docker-compose exec backend python create_admin.py "$USERNAME" "$EMAIL" "$PASSWORD"

echo "Done!"
