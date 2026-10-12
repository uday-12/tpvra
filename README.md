# TPVRA

TPVRA is a third-party risk assessment application. It includes a Next.js web
frontend and an Elysia API backend backed by PostgreSQL.

## Project components

| Component | Stack | Local URL |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | <http://localhost:3000> |
| Backend | Bun, Elysia, Better Auth, Prisma | <http://localhost:3001> |
| API documentation | Swagger / OpenAPI | <http://localhost:3001/docs> |

The backend provides authentication and role-based access for admins, users,
vendors, and assessors, along with assessment, questionnaire, clarification,
file-upload, dashboard, and payment APIs.

## Prerequisites

- [Bun](https://bun.sh/) installed
- PostgreSQL available locally, or Docker if using the backend's Docker Compose
  setup
- Git

## Run locally

Start PostgreSQL first and create a database named `tpvra_db` (or update the
connection string below to match your database).

### 1. Configure and start the backend

From the repository root:

```bash
cd backend
bun install
```

Create `backend/.env` with the following settings. Replace the example
authentication secret with a unique value; generate one with
`openssl rand -base64 32`.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tpvra_db?schema=public"
BETTER_AUTH_SECRET="replace-with-a-unique-secret"
BETTER_AUTH_URL="http://localhost:3001"
```

Apply the checked-in database migrations, then start the API:

```bash
bunx prisma generate
bunx prisma migrate deploy
bun run dev
```

The API should be available at <http://localhost:3001>. Interactive API
documentation is at <http://localhost:3001/docs>.

### 2. Configure and start the frontend

In another terminal, from the repository root:

```bash
cd frontend
bun install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Start the web app:

```bash
bun run dev
```

Open <http://localhost:3000>.

## Docker database option

The backend directory contains a Docker Compose configuration for PostgreSQL
and the API. Review and configure its environment settings before using it:

```bash
cd backend
docker compose up --build
```

The Compose setup exposes PostgreSQL on port `5432` and the API on port `3001`.
To stop the services, run `docker compose down`. Add `-v` only if you also
intend to remove the persisted database volume.

## Useful commands

Run these commands from the corresponding component directory:

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend` | `bun run dev` | Run the API with watch mode |
| `backend` | `bunx prisma generate` | Generate the Prisma client |
| `backend` | `bunx prisma migrate deploy` | Apply committed database migrations |
| `frontend` | `bun run dev` | Run the Next.js development server |
| `frontend` | `bun run build` | Build the frontend for production |
| `frontend` | `bun run start` | Serve a production build |
| `frontend` | `bun run lint` | Check frontend code with Biome |

## Repository layout

```text
backend/
  prisma/       Database schema and migrations
  src/          API server, authentication, and feature modules
frontend/
  app/          Next.js routes and layouts
  apis/         Frontend API clients
  components/   Shared and feature UI components
  hooks/        React hooks
```

## Component documentation

- [Backend README](./backend/README.md) — backend stack, setup, authentication,
  and API documentation
- [Backend Docker guide](./backend/DOCKER.md) — Docker development and deployment
- [Frontend README](./frontend/README.md) — frontend development details
