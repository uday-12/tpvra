# TPVRA Backend

This is the backend API for the TPVRA application, built with **Bun**, **ElysiaJS**, **Better Auth**, and **Prisma** (PostgreSQL).

## Tech Stack

-   **Runtime**: [Bun](https://bun.sh/)
-   **Framework**: [ElysiaJS](https://elysiajs.com/)
-   **Authentication**: [Better Auth](https://better-auth.com/)
-   **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
-   **Logging**: Pino
-   **Documentation**: Swagger (OpenAPI)

## Prerequisites

-   [Bun](https://bun.sh/) (latest version)
-   PostgreSQL Database (Local or Cloud)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (or copy a `.env.example` if available). Configure the following variables:

```env
# Application Environment
NODE_ENV="development" # or "production"

# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/tpvra_db?schema=public"

# Better Auth Configuration
BETTER_AUTH_SECRET="your_generated_secret" # Generate using `openssl rand -base64 32`
BETTER_AUTH_URL="http://localhost:3000" # URL of the frontend/auth client
```

### 4. Database Setup

Generate the Prisma client and push the schema to your database:

```bash
# Generate Prisma Client
bunx prisma generate


# Push Schema to DB (for production)
bunx prisma migrate deploy

# OR Create a Migration (for production/stable changes)
# bunx prisma migrate dev --name init
```

### 5. Running the Application

Start the development server:

```bash
bun run dev
```

The server will start at `http://localhost:3001`.

## key Features

### Authentication & Roles
The application uses Better Auth with the Admin plugin.
-   **Roles**: `admin`, `user`, `vendor`, `assessor`.
-   **Role Management**: Roles are assigned during user creation or managed by admins.
-   **Permissions**: Access control is defined in `src/lib/permissions.ts`.

### API Documentation
Interactive API documentation (Swagger/OpenAPI) is available at:

[http://localhost:3001/docs](http://localhost:3001/docs)

## Project Structure

-   `src/index.ts`: Application entry point.
-   `src/lib/auth.ts`: Authentication configuration.
-   `src/lib/permissions.ts`: Access control and role definitions.
-   `prisma/schema.prisma`: Database schema.
-   `src/modules`: Application modules/routes.