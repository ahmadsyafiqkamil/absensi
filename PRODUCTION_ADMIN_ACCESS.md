# Production Admin Access Guide

## Overview
This guide explains how to access Django Admin and phpMyAdmin in the production environment after the recent configuration updates.

## Access URLs

### Django Admin
- **URL**: `https://api.absensi.local/admin/`
- **Credentials**: Use your Django superuser credentials
- **Features**: Full Django admin interface for managing users, data, and system settings

### phpMyAdmin
- **URL**: `https://phpmyadmin.absensi.local`
- **Credentials**: Use MySQL root credentials from your `production.env` file
- **Features**: Database management interface for MySQL

## Configuration Changes Made

### 1. Caddyfile.prod Updates
- Added Django admin route handling (`/admin*`)
- Added static files serving (`/static*`)
- Added media files serving (`/media*`)
- Added phpMyAdmin subdomain configuration (`phpmyadmin.yourdomain.com`)

### 2. Docker Compose Production Updates
- Removed `profiles: [admin]` from phpMyAdmin service
- Added `PMA_ABSOLUTE_URI` environment variable for proper URL generation
- Removed public port exposure for security (access via Caddy only)

### 3. Django Settings Updates
- Updated CORS configuration to use environment variables
- Updated CSRF settings for production security
- Added proper HTTPS cookie settings

## Environment Variables Required

Make sure your `production.env` file includes:

```bash
# Domain Configuration
FRONTEND_DOMAIN=absensi.local
API_DOMAIN=api.absensi.local

# Django Configuration
SECRET_KEY=rbcFSgLOZjSbpRe9j41V42rphfWQpVQ3HEfoi7dJv-91mpOU4D0xW48FHQUnWxPA5Ks
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,absensi.local,api.absensi.local,phpmyadmin.absensi.local,backend

# CORS and CSRF
CORS_ALLOWED_ORIGINS=https://absensi.local,https://api.absensi.local,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://absensi.local,https://api.absensi.local,https://phpmyadmin.absensi.local
CSRF_COOKIE_SECURE=True

# Database
MYSQL_ROOT_PASSWORD=99ynMILYDGP6ywLY3zrqym8Hgh16VUzx
MYSQL_USER=absensi_user
MYSQL_PASSWORD=LCXGmBVIyL1yT5YDjPqMuQlyFNLQzylD
```

## Deployment Steps

1. **Copy environment file**:
   ```bash
   cp production.env.example production.env
   ```

2. **Edit production.env** with your actual domain and credentials

3. **Deploy with admin access**:
   ```bash
   ./docker-prod-with-admin.sh
   ```

## Security Considerations

### Django Admin Security
- Access is restricted to HTTPS only
- Requires Django superuser authentication
- CSRF protection enabled
- Secure cookie settings for production

### phpMyAdmin Security
- Access is restricted to HTTPS only
- Requires MySQL root authentication
- No public port exposure (Caddy proxy only)
- Proper security headers configured

## Troubleshooting

### Django Admin Not Accessible
1. Check if Django admin is enabled in `INSTALLED_APPS`
2. Verify `ALLOWED_HOSTS` includes your API domain
3. Check Caddy logs: `docker-compose -f docker-compose.prod.yml logs caddy`
4. Verify CSRF_TRUSTED_ORIGINS includes your API domain

### phpMyAdmin Not Accessible
1. Check if phpMyAdmin container is running: `docker-compose -f docker-compose.prod.yml ps`
2. Verify DNS configuration for `phpmyadmin.yourdomain.com`
3. Check Caddy logs for phpMyAdmin: `docker-compose -f docker-compose.prod.yml logs caddy`
4. Verify `PMA_ABSOLUTE_URI` environment variable

### SSL Certificate Issues
1. Ensure your domain DNS is properly configured
2. Check Caddy logs for certificate generation
3. Verify firewall allows ports 80 and 443

## Monitoring

### Service Health Checks
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs [service_name]

# Check service health
docker-compose -f docker-compose.prod.yml exec backend python manage.py check
```

### Log Files
- Caddy logs: `./logs/caddy/`
- Backend logs: `./logs/backend/`
- Frontend logs: `./logs/frontend/`

## Backup Considerations

The production setup includes automatic database backups. Admin access allows you to:
- Monitor backup status
- Manually trigger additional backups
- Restore from backups if needed

## Support

If you encounter issues with admin access:
1. Check the troubleshooting section above
2. Review service logs
3. Verify environment configuration
4. Ensure proper DNS and SSL certificate setup
