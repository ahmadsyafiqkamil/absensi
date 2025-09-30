#!/bin/bash

echo "=== Testing Environment Configuration ==="

echo ""
echo "1. Testing Development Configuration (NODE_ENV=development)"
echo "=================================================="

# Test development environment
docker exec absensi_frontend_dev node -e "
const { getBackendBaseUrl } = require('./src/lib/backend.ts');
console.log('Server-side URL:', getBackendBaseUrl());
console.log('NODE_ENV:', process.env.NODE_ENV);
"

echo ""
echo "2. Testing Production Configuration (NODE_ENV=production)"
echo "====================================================="

# Test production environment by temporarily setting NODE_ENV
docker exec -e NODE_ENV=production absensi_frontend_dev node -e "
const { getBackendBaseUrl } = require('./src/lib/backend.ts');
console.log('Server-side URL:', getBackendBaseUrl());
console.log('NODE_ENV:', process.env.NODE_ENV);
"

echo ""
echo "3. Testing API Utils Configuration"
echo "================================="

# Test api-utils
docker exec absensi_frontend_dev node -e "
const { getBackendUrl, getClientBackendUrl } = require('./src/lib/api-utils.ts');
console.log('Development - getBackendUrl():', getBackendUrl());
console.log('Development - getClientBackendUrl():', getClientBackendUrl());
"

docker exec -e NODE_ENV=production absensi_frontend_dev node -e "
const { getBackendUrl, getClientBackendUrl } = require('./src/lib/api-utils.ts');
console.log('Production - getBackendUrl():', getBackendUrl());
console.log('Production - getClientBackendUrl():', getClientBackendUrl());
"

echo ""
echo "=== Configuration Test Complete ==="

