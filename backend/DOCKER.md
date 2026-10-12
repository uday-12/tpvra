# Docker Setup Guide

This guide explains how to run the backend application using Docker.

## Files Created

- `Dockerfile` - Multi-stage Docker build for production
- `docker-compose.yml` - Orchestrates backend and PostgreSQL database
- `.dockerignore` - Excludes unnecessary files from Docker build
- `.env.docker` - Template for Docker environment variables

## Quick Start

### Option 1: Using Docker Compose (Recommended for Development)

1. Start all services (backend + PostgreSQL):
   ```bash
   docker-compose up
   ```

2. Start in detached mode:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f backend
   ```

4. Stop services:
   ```bash
   docker-compose down
   ```

5. Stop and remove volumes (clean state):
   ```bash
   docker-compose down -v
   ```

### Option 2: Using Docker Only (Production)

1. Build the image:
   ```bash
   docker build -t tpvra-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 \
     -e DATABASE_URL="your_database_url" \
     -e BETTER_AUTH_SECRET="your_secret" \
     -e BETTER_AUTH_URL="http://localhost:3001" \
     tpvra-backend
   ```

## Environment Variables

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for authentication (generate using `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - URL of the backend service

### Optional Variables
- `NODE_ENV` - Environment (development/production)
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENTRY_RELEASE` - Release version for Sentry
- `SENTRY_TRACES_SAMPLE_RATE` - Sentry trace sampling rate
- AWS credentials (if using S3)
- Payment gateway credentials (Razorpay, Stripe)

## Development Workflow

### Hot Reload
The docker-compose.yml is configured with volume mounts for hot reload:
- Changes to `src/` files will automatically reload
- Changes to `prisma/` schema require manual regeneration

### Database Migrations

Run migrations:
```bash
docker-compose exec backend bunx prisma migrate dev
```

Generate Prisma client:
```bash
docker-compose exec backend bunx prisma generate
```

Access Prisma Studio:
```bash
docker-compose exec backend bunx prisma studio
```

### Accessing the Database

Connect to PostgreSQL:
```bash
docker-compose exec postgres psql -U postgres -d tpvra_db
```

## Production Deployment

1. Build for production:
   ```bash
   docker build -t tpvra-backend:latest .
   ```

2. Tag for registry:
   ```bash
   docker tag tpvra-backend:latest your-registry/tpvra-backend:latest
   ```

3. Push to registry:
   ```bash
   docker push your-registry/tpvra-backend:latest
   ```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs backend`
- Verify environment variables are set correctly
- Ensure PostgreSQL is healthy: `docker-compose ps`

### Database connection issues
- Verify DATABASE_URL is correct
- Check if PostgreSQL container is running: `docker ps`
- Ensure PostgreSQL is ready: `docker-compose logs postgres`

### Port already in use
- Change port in docker-compose.yml: `"3002:3001"`
- Or stop the service using port 3001

### Prisma client out of sync
```bash
docker-compose exec backend bunx prisma generate
docker-compose restart backend
```

## Health Check

The backend includes a health check endpoint at `/health`:
```bash
curl http://localhost:3001/health
```

## Useful Commands

```bash
# Rebuild containers
docker-compose up --build

# View running containers
docker-compose ps

# Execute command in backend container
docker-compose exec backend <command>

# Access backend shell
docker-compose exec backend sh

# Clean up everything
docker-compose down -v --rmi all

# View resource usage
docker stats
```

## Notes

- The Dockerfile uses multi-stage builds for optimized image size
- Production build excludes dev dependencies
- Database migrations run automatically on container start
- Hot reload is enabled in development mode via docker-compose
