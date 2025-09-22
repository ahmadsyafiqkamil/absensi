# Quick Start Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Domain `siaki.kjri-dubai.local` configured in `/etc/hosts`

## Quick Deployment

### 1. Setup Local Domains
```bash
sudo ./setup-local-domains.sh
```

### 2. Deploy Production with Admin Access
```bash
./docker-prod-with-admin.sh
```

## Access URLs
- **Frontend**: https://siaki.kjri-dubai.local
- **API**: https://api-siaki.kjri-dubai.local
- **Django Admin**: https://api-siaki.kjri-dubai.local/admin/
- **phpMyAdmin**: https://phpmyadmin-siaki.kjri-dubai.local

## Admin Credentials
- **Django Admin**: Use your Django superuser credentials
- **phpMyAdmin**: 
  - Username: `root`
  - Password: `99ynMILYDGP6ywLY3zrqym8Hgh16VUzx`

## Troubleshooting
- If domains don't work, check `/etc/hosts` file
- Check service status: `docker-compose -f docker-compose.prod.yml ps`
- View logs: `docker-compose -f docker-compose.prod.yml logs [service_name]`

## Security Note
This configuration is for local development/testing. For production deployment with real domains, update the environment variables accordingly.
