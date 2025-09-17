# HeroUI Setup Guide for Docker Environment

## Overview
This guide explains how to set up HeroUI in the Docker environment for the attendance management system.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Access to the project directory

## Quick Start

### 1. Rebuild Docker Containers
```bash
# Make the rebuild script executable
chmod +x ../docker-rebuild-heroui.sh

# Run the rebuild script
../docker-rebuild-heroui.sh
```

### 2. Manual Installation (Alternative)
```bash
# Enter the frontend container
docker exec -it absensi_frontend_dev bash

# Install dependencies
npm install

# Verify HeroUI installation
npm list @heroui/react @heroui/theme @heroui/framer-motion
```

## Dependencies Added

### Core HeroUI Packages
- `@heroui/react` - Main component library
- `@heroui/theme` - Theme system
- `@heroui/framer-motion` - Animation support

### Additional Dependencies
- `framer-motion` - Animation library
- `tailwind-variants` - Utility for component variants

## Docker Configuration Changes

### Dockerfile Updates
- Upgraded to Node.js 20
- Added `libc6-compat` for native modules
- Optimized build process with `npm ci`
- Added build step for production

### Docker Compose Updates
- Added health check for frontend
- Optimized volume mounting
- Added HeroUI-specific environment variables

## Usage Examples

### Basic Button Component
```tsx
import { Button } from "@heroui/react";

export default function MyComponent() {
  return (
    <Button color="primary" variant="solid">
      Click me
    </Button>
  );
}
```

### Card Component
```tsx
import { Card, CardBody, CardHeader, CardTitle } from "@heroui/react";

export default function MyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardBody>
        Content goes here
      </CardBody>
    </Card>
  );
}
```

## Migration Strategy

### Phase 1: Setup (Current)
- ✅ Install HeroUI dependencies
- ✅ Update Docker configuration
- ✅ Create health check API

### Phase 2: Component Migration
- [ ] Replace custom Button with HeroUI Button
- [ ] Replace custom Card with HeroUI Card
- [ ] Replace custom Input with HeroUI Input
- [ ] Replace custom Select with HeroUI Select

### Phase 3: Advanced Features
- [ ] Implement HeroUI Calendar
- [ ] Add HeroUI Provider system
- [ ] Implement HeroUI Table
- [ ] Add animations with Framer Motion

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clean and rebuild
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache frontend
```

#### 2. Dependency Issues
```bash
# Enter container and reinstall
docker exec -it absensi_frontend_dev bash
rm -rf node_modules package-lock.json
npm install
```

#### 3. Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

### Health Check
```bash
# Check frontend health
curl http://localhost:8000/api/v2/auth/health/

# Check container logs
docker-compose -f docker-compose.dev.yml logs -f frontend
```

## Development Workflow

### 1. Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. View Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### 3. Enter Container
```bash
docker exec -it absensi_frontend_dev bash
```

### 4. Install New Dependencies
```bash
# Inside container
npm install <package-name>
```

## Production Deployment

### Build Production Image
```bash
docker build -f frontend/Dockerfile.prod -t absensi-frontend:prod ./frontend
```

### Run Production Container
```bash
docker run -p 3000:3000 absensi-frontend:prod
```

## Next Steps

1. **Test HeroUI Components**: Create test pages to verify all components work
2. **Migrate Existing Components**: Start with simple components like Button and Card
3. **Update Styling**: Adapt existing TailwindCSS classes to HeroUI variants
4. **Add Animations**: Implement Framer Motion animations for better UX

## Resources

- [HeroUI Documentation](https://heroui.org)
- [HeroUI Components](https://heroui.org/docs/components)
- [Framer Motion](https://www.framer.com/motion/)
- [TailwindCSS v4](https://tailwindcss.com/docs)

