# Backend Coding Standards - MeraEvents AI

This document outlines the coding standards and best practices for the MeraEvents AI backend, built with **Bun**, **Elysia.js**, **Prisma**, and **TypeScript**.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Module Architecture](#module-architecture)
4. [Naming Conventions](#naming-conventions)
5. [TypeScript Standards](#typescript-standards)
6. [API Design Patterns](#api-design-patterns)
7. [Service Layer Patterns](#service-layer-patterns)
8. [Database & Prisma Patterns](#database--prisma-patterns)
9. [Validation & Schema Patterns](#validation--schema-patterns)
10. [Error Handling](#error-handling)
11. [Authentication & Authorization](#authentication--authorization)
12. [Documentation Standards](#documentation-standards)
13. [Code Quality & Best Practices](#code-quality--best-practices)

---

## Technology Stack

- **Runtime**: Bun (latest)
- **Framework**: Elysia.js (latest)
- **Database ORM**: Prisma 6.17.0+
- **Database**: PostgreSQL
- **Authentication**: Better Auth 1.4+
- **Schema Validation**: Elysia's built-in TypeBox (`t`)
- **Schema Generation**: Prismabox 1.1.25+
- **API Documentation**: Swagger/OpenAPI via `@elysiajs/swagger`
- **File Storage**: AWS S3 (`@aws-sdk/client-s3`)
- **Logging**: `@bogeychan/elysia-logger` with `pino-pretty`

---

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files (S3, Swagger, etc.)
│   ├── database/         # Database client initialization
│   ├── lib/              # Shared libraries and utilities
│   ├── modules/          # Feature modules (domain-driven)
│   │   ├── auth/
│   │   ├── events/
│   │   ├── categories/
│   │   └── [feature]/
│   │       ├── index.ts      # API routes
│   │       ├── model.ts      # TypeBox schemas & types
│   │       └── service.ts    # Business logic
│   ├── plugins/          # Elysia plugins (error handlers, etc.)
│   └── index.ts          # Application entry point
├── prisma/
│   └── schema.prisma     # Prisma schema
├── generated/
│   ├── prisma/           # Generated Prisma Client
│   └── prismabox/        # Generated TypeBox schemas
└── package.json
```

### Key Principles:
- **Domain-Driven Design**: Each feature is a self-contained module
- **Separation of Concerns**: Routes, models, and services are separated
- **Generated Code**: Use Prismabox to auto-generate TypeBox schemas from Prisma models

---

## Module Architecture

Each module follows a **three-file pattern**:

### 1. `index.ts` - API Routes (Controller Layer)

**Purpose**: Define HTTP endpoints, route handlers, and API documentation

```typescript
import { Elysia, t } from "elysia";
import { Auth } from "../auth";
import { CategoryService } from "./service";
import { ListCategoriesQuery, PaginatedCategoryResponse } from "./model";
import { categoryPlainInputCreate, categoryPlainInputUpdate } from "@/generated/prismabox/category";

export const CategoryAPIs = new Elysia({ name: "CategoryAPIs" })
  .group("/categories", (app) =>
    app
      // Public routes first
      .get("", ({ query }) => CategoryService.listCategories(query), {
        query: ListCategoriesQuery,
        response: { "200": PaginatedCategoryResponse },
        detail: {
          summary: "List categories with pagination",
          description: "This API returns a list of categories with optional filters",
          tags: ["Categories"]
        }
      })
      // Protected routes after .use(Auth)
      .use(Auth)
      .post('/create', ({ body, user }) => CategoryService.createCategory(body, user.id), {
        body: categoryPlainInputCreate,
        detail: {
          summary: "Create new category",
          tags: ["Categories"]
        },
        auth: true
      })
  );

// Example with group-level params (for nested resources)
export const TaskAPIs = new Elysia({ name: "TaskAPIs" }).group(
  "/events/:eventId/tasks",
  { params: t.Object({ eventId: t.Number() }) }, // Define types here to avoid manual casting
  (app) =>
    app
      .use(Auth)
      .get(
        "",
        ({ params: { eventId }, query }) => TaskService.listTasks(eventId, query), // eventId is properly typed as number
        {
          query: ListTasksQuery,
          response: { "200": PaginatedTaskResponse },
          detail: {
            summary: "List tasks for an event",
            tags: ["Tasks"],
          },
        }
      )
      .post(
        "",
        ({ params: { eventId }, body }) => TaskService.createTask(eventId, body),
        {
          body: CreateTaskBody,
          response: { "200": SuccessMessageResponse },
          detail: {
            summary: "Create a new task for an event",
            tags: ["Tasks"],
          },
          auth: true,
        }
      )
      .put(
        "/:taskId",
        ({ params: { eventId, taskId }, body }) => TaskService.updateTask(eventId, taskId, body),
        {
          params: t.Object({ eventId: t.Number(), taskId: t.Number() }), // Additional route-level params
          body: UpdateTaskBody,
          response: { "200": SuccessMessageResponse },
          detail: {
            summary: "Update an existing task",
            tags: ["Tasks"],
          },
          auth: true,
        }
      )
);
```

**Standards**:
- ✅ Export a named Elysia instance with descriptive name (e.g., `CategoryAPIs`)
- ✅ Use `.group()` for route prefixing
- ✅ **For nested resources**: Define group-level params with types in the `.group()` call to avoid manual casting (e.g., `{ params: t.Object({ eventId: t.Number() }) }`)
- ✅ Place public routes **before** `.use(Auth)`
- ✅ Place protected routes **after** `.use(Auth)` and add `auth: true` to options
- ✅ Always define `query`, `body`, `params`, and `response` schemas
- ✅ Always include `detail` object with `summary`, `description`, and `tags` for Swagger
- ✅ Delegate business logic to Service layer
- ✅ Use destructuring for handler parameters: `({ body, user, params, query })`
- ✅ **Avoid manual type casting**: Use proper TypeBox schemas in group/route definitions instead of `Number()`, `String()`, etc. in handlers

### 2. `model.ts` - Schemas & Types

**Purpose**: Define TypeBox validation schemas and TypeScript types

> [!IMPORTANT]
> **ALL types must be defined in `model.ts`**. Never define types inline in `service.ts` or `index.ts`. This ensures a single source of truth for all type definitions.

```typescript
import { t } from "elysia";
import { categoryPlain } from "@/generated/prismabox/category";
import { prisma } from "@/database/prisma-client";

// Query parameter schema
export const ListCategoriesQuery = t.Object({
  searchQuery: t.Optional(t.String({ description: "Search query for category name" })),
  status: t.Optional(t.Boolean({ description: "Filter by status" })),
  page: t.Optional(t.Number({ minimum: 1, default: 1, description: "Page number" })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20, description: "Items per page" })),
});

// Extract TypeScript type from schema
export type ListCategoriesQuery = typeof ListCategoriesQuery.static;

// Response schema
export const PaginatedCategoryResponse = t.Object({
  categories: t.Array(categoryPlain),
  totalCount: t.Number(),
  totalPages: t.Number(),
  currentPage: t.Number(),
  hasNextPage: t.Boolean(),
  hasPrevPage: t.Boolean(),
});

export type PaginatedCategoryResponse = typeof PaginatedCategoryResponse.static;

// Success response type (for create/update/delete operations)
export const SuccessMessageResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;
```

**Standards**:
- ✅ **ALL types MUST be defined in `model.ts`** - Never define types in service.ts or index.ts
- ✅ Use **TypeBox** (`t`) from Elysia for all schemas
- ✅ Import generated schemas from `@/generated/prismabox/[model]` when available
- ✅ Always extract TypeScript types using `typeof Schema.static`
- ✅ Use descriptive property descriptions for API documentation
- ✅ Set sensible defaults and constraints (min, max, default values)
- ✅ Use `t.Optional()` for optional fields
- ✅ Use `t.Enum()` or `t.Union([t.Literal(...)])` for enums
- ✅ Prefix query schemas with `List`, `Get`, `Create`, etc.
- ✅ Suffix response schemas with `Response`
- ✅ Define `SuccessMessageResponse` for create/update/delete operations

### 3. `service.ts` - Business Logic

**Purpose**: Implement business logic, database operations, and data transformations

> [!IMPORTANT]
> **Import ALL types from `model.ts`**. Never define types inline in service files.

```typescript
import type { Prisma } from "@/generated/prisma";
import type { 
  ListCategoriesQuery, 
  PaginatedCategoryResponse,
  SuccessMessageResponse 
} from "./model";
import { categoryPlainInputCreate } from "@/generated/prismabox/category";
import { prisma } from "@/database/prisma-client";

export abstract class CategoryService {
  /**
   * List categories with pagination and filters
   */
  static async listCategories(query: ListCategoriesQuery): Promise<PaginatedCategoryResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Prisma.categoryWhereInput = {
      deleted: false,
    };

    if (query.searchQuery) {
      where.name = {
        contains: query.searchQuery,
        mode: 'insensitive',
      };
    }

    // Get total count
    const totalCount = await prisma.category.count({ where });

    // Get paginated data
    const categories = await prisma.category.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { order: 'asc' },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      categories,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Create a new category
   * Returns success message only, not the created object
   */
  static async createCategory(
    data: typeof categoryPlainInputCreate.static, 
    userId: string
  ): Promise<SuccessMessageResponse> {
    await prisma.category.create({
      data: {
        ...data,
        createdBy: userId,
        modifiedBy: userId,
        updatedAt: new Date(),
      }
    });

    return {
      success: true,
      message: "Category created successfully",
    };
  }

  /**
   * Update an existing category
   * Returns success message only, not the updated object
   */
  static async updateCategory(
    categoryId: number,
    data: typeof categoryPlainInputUpdate.static,
    userId: string
  ): Promise<SuccessMessageResponse> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, deleted: false },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...data,
        modifiedBy: userId,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Category updated successfully",
    };
  }

  /**
   * Delete a category (soft delete)
   * Returns success message only
   */
  static async deleteCategory(
    categoryId: number,
    userId: string
  ): Promise<SuccessMessageResponse> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, deleted: false },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        deleted: true,
        modifiedBy: userId,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Category deleted successfully",
    };
  }
}
```

**Standards**:
- ✅ Use **abstract class** with **static methods** (no instantiation needed)
- ✅ **Import ALL types from `model.ts`** - Never define types inline
- ✅ Add JSDoc comments for all public methods
- ✅ Use typed parameters from model types
- ✅ Use `Prisma.[Model]WhereInput` for type-safe where clauses
- ✅ Always filter out soft-deleted records (`deleted: false`)
- ✅ Use `mode: 'insensitive'` for case-insensitive string searches
- ✅ Calculate pagination metadata (totalPages, hasNextPage, hasPrevPage)
- ✅ Use `??` (nullish coalescing) for default values
- ✅ Track `createdBy`, `modifiedBy`, `updatedAt` fields
- ✅ Use transactions (`prisma.$transaction`) for multi-step operations
- ✅ Throw descriptive errors (e.g., `throw new Error("Category not found")`)
- ✅ **CRUD operations return `SuccessMessageResponse` only** - Don't return created/updated objects
- ✅ Validate existence before update/delete operations

---

## Naming Conventions

### Files & Directories
- **Modules**: `kebab-case` (e.g., `registration-custom-fields/`)
- **Files**: `kebab-case` (e.g., `upload-file.ts`)
- **Config files**: `kebab-case` with `.config` suffix (e.g., `s3.config.ts`)

### Code
- **Classes**: `PascalCase` (e.g., `CategoryService`, `EventService`)
- **Functions/Methods**: `camelCase` (e.g., `listCategories`, `createEvent`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `S3_CONFIG`, `MAX_FILE_SIZE`)
- **Interfaces/Types**: `PascalCase` (e.g., `ListCategoriesQuery`)
- **Enums**: `PascalCase` for enum name, `SCREAMING_SNAKE_CASE` for values
- **Variables**: `camelCase` (e.g., `totalCount`, `currentPage`)

### API Exports
- **Route Groups**: `[Feature]APIs` (e.g., `EventAPIs`, `CategoryAPIs`)
- **Services**: `[Feature]Service` (e.g., `EventService`, `DiscountService`)

### Database
- **Tables**: `PascalCase` (e.g., `UserProfile`, `EventCategory`)
- **Columns**: `PascalCase` (e.g., `FirstName`, `CreatedAt`)

---

## TypeScript Standards

### Configuration
- **Target**: ES2021
- **Module**: ES2022
- **Strict Mode**: Enabled
- **Path Aliases**: Use `@/*` for `src/*` and `@/generated/*` for `generated/*`

### Type Safety
```typescript
// ✅ DO: Use explicit types for function parameters and return values
static async listEvents(query: ListEventsQuery): Promise<PaginatedEventResponse> {
  // ...
}

// ✅ DO: Use Prisma types for where clauses
const where: Prisma.eventWhereInput = { deleted: false };

// ✅ DO: Extract types from schemas
export type ListEventsQuery = typeof ListEventsQuery.static;

// ❌ DON'T: Use 'any' type
const data: any = await fetchData(); // Bad

// ❌ DON'T: Use 'unknown' type
const data: unknown = await fetchData(); // Bad

// ❌ DON'T: Use 'never' type inappropriately
const result: never = someFunction(); // Bad

// ✅ DO: Use proper TypeScript types
const data: ResponseData = await fetchData();
if (isValidData(data)) {
  // ...
}
```

### Null Safety
```typescript
// ✅ DO: Use nullish coalescing for defaults
const page = query.page ?? 1;
const limit = query.limit ?? 20;

// ✅ DO: Use optional chaining
const userName = user?.name ?? 'Anonymous';

// ✅ DO: Handle null/undefined explicitly
if (!event) {
  throw new Error('Event not found');
}
```

---

## API Design Patterns

### RESTful Conventions
```typescript
// List/Index
.get("", handler)                    // GET /events

// Get by ID
.get("/:id", handler)                // GET /events/123

// Create
.post("/create", handler)            // POST /events/create

// Update
.put("/update/:id", handler)         // PUT /events/update/123

// Delete (soft delete)
.delete("/delete/:id", handler)      // DELETE /events/delete/123

// Nested resources
.get("/:eventId/tickets", handler)   // GET /events/123/tickets
```

### Response Patterns

#### Success Response
```typescript
// List endpoints
return {
  items: [...],
  totalCount: 100,
  totalPages: 10,
  currentPage: 1,
  hasNextPage: true,
  hasPrevPage: false,
};

// Create/Update/Delete endpoints
return {
  success: true,
  message: "Resource created successfully",
};
```

#### Error Response (handled by error-handler plugin)
```typescript
{
  success: false,
  message: "Error description",
  error: "Detailed error message" // Optional
}
```

### CRUD API Response Standards

> [!IMPORTANT]
> **Clean API Design**: Create, Update, and Delete operations should return simple success messages, NOT the created/updated object.

#### ✅ DO: Return Success Messages Only
```typescript
// Create endpoint
.post('/create', async ({ body, user }) => {
  return await CategoryService.createCategory(body, user.id);
}, {
  body: categoryPlainInputCreate,
  response: {
    "200": t.Object({
      success: t.Boolean(),
      message: t.String(),
    })
  }
})

// Update endpoint
.put('/update/:id', async ({ params: { id }, body, user }) => {
  return await CategoryService.updateCategory(id, body, user.id);
}, {
  body: categoryPlainInputUpdate,
  response: {
    "200": t.Object({
      success: t.Boolean(),
      message: t.String(),
    })
  }
})

// Delete endpoint
.delete('/delete/:id', async ({ params: { id }, user }) => {
  return await CategoryService.deleteCategory(id, user.id);
}, {
  response: {
    "200": t.Object({
      success: t.Boolean(),
      message: t.String(),
    })
  }
})
```

#### ❌ DON'T: Return Created/Updated Objects
```typescript
// ❌ BAD: Returning the created object
static async createCategory(data: CreateCategoryData, userId: string) {
  const category = await prisma.category.create({ data });
  return category; // Don't do this
}

// ✅ GOOD: Return success message only
static async createCategory(data: CreateCategoryData, userId: string): Promise<SuccessMessageResponse> {
  await prisma.category.create({ data });
  return {
    success: true,
    message: "Category created successfully",
  };
}
```

**Rationale**:
- Reduces response payload size
- Prevents accidental data leakage
- Client can refetch if needed (with React Query, this is automatic)
- Cleaner API design
- Consistent response structure across all mutations

### Pagination Standards
```typescript
// Query parameters
{
  page: 1,           // Default: 1, Minimum: 1
  limit: 20,         // Default: 20, Minimum: 1, Maximum: 100
}

// Response metadata
{
  items: [...],
  totalCount: number,
  totalPages: number,
  currentPage: number,
  hasNextPage: boolean,
  hasPrevPage: boolean,
}
```

---

## Service Layer Patterns

### Abstract Class Pattern
```typescript
// ✅ DO: Use abstract class with static methods
export abstract class EventService {
  static async listEvents(query: ListEventsQuery): Promise<PaginatedEventResponse> {
    // Implementation
  }
}

// ❌ DON'T: Use regular class with instance methods
export class EventService {
  async listEvents(query: ListEventsQuery): Promise<PaginatedEventResponse> {
    // Implementation
  }
}
```

### Method Organization
```typescript
export abstract class EventService {
  // 1. List/Query methods
  static async listEvents(query: ListEventsQuery) { }

  // 2. Get by ID methods
  static async getEventById(id: number) { }

  // 3. Create methods
  static async createEvent(data: CreateEventData, userId: string) { }

  // 4. Update methods
  static async updateEvent(id: number, data: UpdateEventData, userId: string) { }

  // 5. Delete methods
  static async deleteEvent(id: number, userId: string) { }

  // 6. Utility/Helper methods
  static async checkSlugAvailability(slug: string) { }

  // 7. Private helper methods (at the end)
  private static async validateEventData(data: any) { }
}
```

### Business Logic Documentation
```typescript
/**
 * Calculate discount for a given order
 *
 * Business Logic:
 * 1. Validate discount code
 * 2. Check minimum order amount
 * 3. Filter tickets that are eligible for this discount
 * 4. Calculate discount based on calculation_mode (flat or percentage)
 * 5. Apply max_discount_amount cap (for percentage discounts)
 *
 * Edge Cases:
 * - Percentage clamped to 100% maximum
 * - Flat discount cannot exceed ticket price (no negative prices)
 * - Respects max_discount_amount cap
 */
static async calculateDiscount(request: CalculateDiscountRequest): Promise<DiscountCalculationResult> {
  // Implementation
}
```

---

## Database & Prisma Patterns

### Prisma Client Initialization
```typescript
// src/database/prisma-client.ts
import { PrismaClient } from "@/generated/prisma";

export const prisma = new PrismaClient();
```

### Schema Generation
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

generator prismabox {
  provider                    = "prismabox"
  inputModel                  = "true"
  typeboxImportDependencyName = "elysia"
  typeboxImportVariableName   = "t"
  output                      = "../generated/prismabox"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

### Migrations

> [!IMPORTANT]
> **Strict Migration Policy**: Whenever the `prisma/schema.prisma` file is modified, you MUST create and run migrations using `bun run prisma migrate dev` or `npm run prisma migrate dev`. Failure to do so can lead to database inconsistencies and deployment issues.

```bash
# Generate and apply a new migration in development
bun run prisma migrate dev --name "your-migration-description"

# Or using npm
npm run prisma migrate dev --name "your-migration-description"
```

**Migration Naming**: Use descriptive names that clearly indicate what the migration does (e.g., `add-user-email-index`, `create-events-table`).

**Important Notes**:
- Always test migrations in a development environment before deploying.
- Never modify migration files manually after they are created.
- For production deployments, use `prisma migrate deploy` instead of `migrate dev`.

---

### Query Patterns

#### Filtering
```typescript
// Build where clause incrementally
const where: Prisma.eventWhereInput = {
  deleteRequest: { not: true },
};

if (query.status) {
  where.status = query.status;
}

if (query.searchQuery) {
  where.title = {
    contains: query.searchQuery,
    mode: 'insensitive',
  };
}

if (query.categoryId) {
  where.categoryId = query.categoryId;
}
```

#### Pagination
```typescript
const page = query.page ?? 1;
const limit = query.limit ?? 20;
const offset = (page - 1) * limit;

const totalCount = await prisma.event.count({ where });

const events = await prisma.event.findMany({
  where,
  orderBy,
  skip: offset,
  take: limit,
});

const totalPages = Math.ceil(totalCount / limit);
```

#### Sorting
```typescript
let orderBy: Prisma.eventOrderByWithRelationInput = { startDateTime: 'asc' };

switch (query.sortBy) {
  case 'date':
    orderBy = { startDateTime: 'asc' };
    break;
  case 'popularity':
    orderBy = { popularity: 'desc' };
    break;
  case 'name':
    orderBy = { title: 'asc' };
    break;
}
```

#### Soft Delete
```typescript
// ✅ DO: Always filter soft-deleted records in queries
const where: Prisma.categoryWhereInput = {
  deleted: false,
};

// ✅ DO: Soft delete instead of hard delete
await prisma.category.update({
  where: { id: categoryId },
  data: {
    deleted: true,
    modifiedBy: userId,
    updatedAt: new Date(),
  }
});

// ❌ DON'T: Hard delete
await prisma.category.delete({ where: { id: categoryId } });
```

#### Transactions
```typescript
// ✅ DO: Use transactions for multi-step operations
await prisma.$transaction(async (tx) => {
  // 1. Create main record
  const discount = await tx.discount.create({ data: {...} });

  // 2. Create related records
  await tx.ticket_discount.createMany({
    data: ticketIds.map(ticketId => ({
      discount_id: discount.id,
      ticket_id: ticketId,
    })),
  });

  return discount;
});
```

#### Atomic Operations
```typescript
// ✅ DO: Use atomic increment/decrement
await prisma.discount.update({
  where: { id: discountId },
  data: {
    used_count: {
      increment: 1,
    },
  },
});

// ❌ DON'T: Read-modify-write (race condition)
const discount = await prisma.discount.findUnique({ where: { id: discountId } });
await prisma.discount.update({
  where: { id: discountId },
  data: { used_count: discount.used_count + 1 },
});
```

---

## Validation & Schema Patterns

### TypeBox Schema Definitions
```typescript
import { t } from "elysia";

// String validation
t.String({
  minLength: 4,
  maxLength: 100,
  description: 'Event title'
})

// Number validation
t.Number({
  minimum: 1,
  maximum: 100,
  default: 20
})

// Date validation
t.Date()

// Optional fields
t.Optional(t.String())

// Arrays
t.Array(t.String({ minLength: 2, maxLength: 30 }))

// Enums
t.Enum(EventType)

// Union types (for literals)
t.Union([
  t.Literal("name"),
  t.Literal("order"),
  t.Literal("created_at"),
])

// Objects
t.Object({
  name: t.String(),
  value: t.Number(),
})
```

### Using Generated Schemas
```typescript
// Import from Prismabox
import {
  categoryPlain,                // Full model schema
  categoryPlainInputCreate,     // Create input schema
  categoryPlainInputUpdate      // Update input schema
} from "@/generated/prismabox/category";

// Use in routes
.post('/create', handler, {
  body: categoryPlainInputCreate,
})

// Use in responses
.get('', handler, {
  response: {
    "200": t.Array(categoryPlain)
  }
})
```

---

## Error Handling

### Global Error Handler
```typescript
// src/plugins/error-handler.ts
import { Elysia } from "elysia";

export const errorHandler = new Elysia().onError(({ code, error, set }) => {
  console.error("Error:", error);

  // Validation error
  if (code === "VALIDATION") {
    set.status = 400;
    return {
      success: false,
      message: "Invalid request data",
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }

  // Not found error
  if (code === "NOT_FOUND") {
    set.status = 404;
    return {
      success: false,
      message: "Resource not found",
    };
  }

  // Parse error
  if (code === "PARSE") {
    set.status = 400;
    return {
      success: false,
      message: "Failed to parse request",
    };
  }

  // Handle custom thrown errors
  if (error instanceof Error) {
    const isClientError =
      error.message.includes("exceeds") ||
      error.message.includes("Invalid") ||
      error.message.includes("required") ||
      error.message.includes("not found");

    set.status = isClientError ? 400 : 500;
    return {
      success: false,
      message: error.message,
    };
  }

  // Default error
  set.status = 500;
  return {
    success: false,
    message: "Internal server error",
  };
});
```

### Module-Level Error Handling
```typescript
// For specific modules with custom error handling
const handleError = (error: Error, set: { status: number }) => {
  console.error("File operation error:", error);

  const isClientError =
    error.message.includes("exceeds") ||
    error.message.includes("Invalid") ||
    error.message.includes("required") ||
    error.message.includes("not found");

  set.status = isClientError ? 400 : 500;
  return {
    success: false,
    message: error.message,
  };
};

// Use in route handlers
.post("/upload", async ({ body, set }) => {
  try {
    // Operation
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      return handleError(error, set);
    }
    // Fallback for unexpected error types
    set.status = 500;
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
})
```

### Throwing Errors in Services
```typescript
// ✅ DO: Throw descriptive errors
if (!event) {
  throw new Error('Event not found or you do not have permission to view it');
}

if (discount.usage_limit !== null && discount.used_count >= discount.usage_limit) {
  throw new Error("This discount expired");
}

// ✅ DO: Validate before operations
if (tickets.length !== data.ticketIds.length) {
  throw new Error("Some ticket IDs are invalid or don't belong to this event");
}
```

---

## Authentication & Authorization

### Better Auth Setup
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/generated/prisma";
import { openAPI } from 'better-auth/plugins';

const prisma = new PrismaClient();

export const auth = betterAuth({
  basePath: '/api',
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
    }
  },
  plugins: [openAPI()],
  logger: {
    level: process.env.NODE_ENV !== "production" ? "debug" : "info",
  },
  trustedOrigins: ['http://localhost:3001', 'http://localhost:3000'],
});
```

### Auth Middleware
```typescript
// src/modules/auth/index.ts
import { auth } from "@/lib/auth";
import Elysia from "elysia";

export const Auth = new Elysia({ name: "AuthAPIs" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session) return status(401);

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
```

### Using Auth in Routes
```typescript
export const EventAPIs = new Elysia({ name: "EventAPIs" })
  .group("/events", (app) =>
    app
      // Public routes (no auth required)
      .get("", ({ query }) => EventService.listEvents(query))

      // Apply auth middleware
      .use(Auth)

      // Protected routes (auth required)
      .post('/create', ({ body, user }) => {
        return EventService.createEvent(body, user.id);
      }, {
        body: CreateEventProps,
        auth: true  // Mark as authenticated route
      })

      .get('/:eventId', async ({ params: { eventId }, user }) => {
        const event = await EventService.getEventById(eventId, user.id);
        if (!event) {
          throw new Error('Event not found or you do not have permission to view it');
        }
        return event;
      }, {
        params: t.Object({ eventId: t.Number() }),
        auth: true
      })
  );
```

### Authorization Patterns
```typescript
// ✅ DO: Check ownership in service layer
static async getEventById(eventId: number, userId: string) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      owner_id: userId,  // Ensure user owns the event
      delete_request: { not: true },
    },
  });

  if (!event) {
    return null;
  }

  return event;
}

// ✅ DO: Validate user permissions before mutations
static async updateEvent(eventId: number, data: UpdateEventData, userId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, owner_id: userId },
  });

  if (!event) {
    throw new Error('Event not found or you do not have permission to update it');
  }

  // Proceed with update
}
```

---

## Documentation Standards

### API Documentation (Swagger/OpenAPI)

#### Route Documentation
```typescript
.get("/events", handler, {
  query: ListEventsQuery,
  response: {
    "200": PaginatedEventResponse,
  },
  detail: {
    summary: "List events with pagination",
    description: `
      Get a paginated list of events with optional filters.

      **Filters:**
      - status: Filter by event status
      - searchQuery: Search by event title (case-insensitive)
      - categoryId: Filter by category

      **Pagination:**
      - page: Page number (default: 1)
      - limit: Items per page (default: 20, max: 100)
    `,
    tags: ["Events"]
  }
})
```

#### JSDoc Comments
```typescript
/**
 * List events with pagination and filters
 *
 * @param query - Query parameters for filtering and pagination
 * @returns Paginated list of events
 */
static async listEvents(query: ListEventsQuery): Promise<PaginatedEventResponse> {
  // Implementation
}

/**
 * Validate discount
 *
 * Validation Rules:
 * 1. Must be active (status = true)
 * 2. Must not be deleted
 * 3. Current time must be >= start_date (if set)
 * 4. Current time must be <= end_date (if set)
 * 5. used_count must be < usage_limit (if set)
 *
 * @param discount - Discount object to validate
 * @param now - Current timestamp (defaults to new Date())
 * @returns Validation result with isValid flag and optional message
 */
static validateDiscount(discount: DiscountWithTickets, now: Date = new Date()): DiscountValidationResult {
  // Implementation
}
```

### Code Comments

#### When to Comment
```typescript
// ✅ DO: Comment complex business logic
// OLD PHP EDGE CASE: Expired mid-transaction
// Always pass current timestamp to catch expiry during checkout
if (discount.end_date && now > discount.end_date) {
  return {
    isValid: false,
    message: `This discount code expired on ${discount.end_date.toLocaleDateString()}`,
    reason: 'expired',
  };
}

// ✅ DO: Comment non-obvious decisions
// Build where clause incrementally for better type safety
const where: Prisma.eventWhereInput = {
  deleteRequest: { not: true },
};

// ✅ DO: Mark TODOs and FIXMEs
// FIXME: Ensure the start date is less than end date
// TODO: Implement when referral_code is added to User model

// ❌ DON'T: Comment obvious code
// Increment the counter
counter++;
```

---

## Code Quality & Best Practices

### Code Organization & Complexity

#### File Size Limits
- ✅ **Business logic files should contain less than 500-600 lines of code**
- ✅ **Break large service files into multiple focused files when approaching 1000 lines**
- ✅ **Reason**: Files exceeding 500-600 lines become difficult to debug and maintain
- ✅ **Pattern**: Split related functionality into separate service classes (e.g., `EventService`, `EventValidationService`, `EventCalculationService`)

#### Method Complexity Limits
- ✅ **Methods should strictly follow cognitive complexity of 15**
- ✅ **Cognitive complexity measures**: Nested conditions, loops, early returns, and logical operators
- ✅ **Pattern**: Extract complex logic into smaller, focused methods
- ✅ **Tools**: Use static analysis tools to enforce this limit during code review

```typescript
// ❌ DON'T: High cognitive complexity method
static async processOrder(orderId: number, userId: string) {
  if (!orderId) throw new Error('Order ID required');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Unauthorized');

  let total = 0;
  for (const item of order.items) {
    if (item.status === 'active') {
      if (item.discount) {
        if (item.discount.type === 'percentage') {
          total += item.price * (1 - item.discount.value / 100);
        } else {
          total += item.price - item.discount.value;
        }
      } else {
        total += item.price;
      }
    }
  }

  if (total > 1000) {
    // Apply bulk discount
    total *= 0.9;
  }

  return total;
}

// ✅ DO: Break down into smaller methods (cognitive complexity < 15)
static async processOrder(orderId: number, userId: string) {
  this.validateOrderAccess(orderId, userId);
  const order = await this.getOrderWithItems(orderId);
  const total = this.calculateOrderTotal(order);
  return this.applyBulkDiscount(total);
}

private static validateOrderAccess(orderId: number, userId: string) {
  if (!orderId) throw new Error('Order ID required');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.userId !== userId) throw new Error('Unauthorized');
}

private static async getOrderWithItems(orderId: number) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
}

private static calculateOrderTotal(order: OrderWithItems) {
  return order.items
    .filter(item => item.status === 'active')
    .reduce((total, item) => {
      const price = this.applyItemDiscount(item);
      return total + price;
    }, 0);
}

private static applyItemDiscount(item: OrderItem) {
  if (!item.discount) return item.price;

  if (item.discount.type === 'percentage') {
    return item.price * (1 - item.discount.value / 100);
  } else {
    return item.price - item.discount.value;
  }
}

private static applyBulkDiscount(total: number) {
  return total > 1000 ? total * 0.9 : total;
}
```

### Strict Type Safety Rules

**NEVER use these types:**
- ❌ `any` - Disables type checking completely
- ❌ `unknown` - Too generic, defeats TypeScript's purpose
- ❌ `never` - Only for unreachable code, not for general use

**ALWAYS use:**
- ✅ Explicit types from schemas: `typeof Schema.static`
- ✅ Prisma generated types: `Prisma.ModelWhereInput`
- ✅ Custom interfaces and types
- ✅ Type inference when the type is obvious

```typescript
// ❌ DON'T: Use any, unknown, or never
function processData(data: any) { }
function handleError(error: unknown) { }
const result: never = getValue();

// ✅ DO: Use explicit types
function processData(data: EventData) { }
function handleError(error: Error) { }
const result: EventResponse = getValue();

// ✅ DO: Use type inference when obvious
const count = 10; // TypeScript infers number
const name = "Event"; // TypeScript infers string

// ✅ DO: Type check before using
if (error instanceof Error) {
  console.error(error.message);
}
```

### Import Organization
```typescript
// 1. External dependencies
import { Elysia, t } from "elysia";
import { prisma } from "@/database/prisma-client";

// 2. Type imports
import type { Prisma } from "@/generated/prisma";
import type { ListEventsQuery, PaginatedEventResponse } from "./model";

// 3. Generated schemas
import { eventPlain } from "@/generated/prismabox/event";

// 4. Internal modules
import { Auth } from "../auth";
import { EventService } from "./service";
```

### Async/Await Patterns
```typescript
// ✅ DO: Use async/await for better readability
static async createEvent(data: CreateEventData, userId: string) {
  const event = await prisma.event.create({ data });
  const tickets = await prisma.ticket.createMany({ data: ticketsData });
  return { event, tickets };
}

// ✅ DO: Use Promise.all for parallel operations
const [events, totalCount] = await Promise.all([
  prisma.event.findMany({ where }),
  prisma.event.count({ where }),
]);

// ✅ DO: Use Promise.all for updating multiple records
await Promise.all(
  data.tickets.map(ticket =>
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { ...ticket }
    })
  )
);
```

### Destructuring
```typescript
// ✅ DO: Destructure handler parameters
.get("/:id", ({ params: { id }, user, query }) => {
  return EventService.getEventById(id, user.id);
})

// ✅ DO: Destructure objects for cleaner code
const { page = 1, limit = 20, searchQuery } = query;
```

### Type Conversions
```typescript
// ✅ DO: Convert Decimal to Number for API responses
price: Number(ticket.price)

// ✅ DO: Handle null/undefined in conversions
minOrderAmount: discount.min_order_amount ? Number(discount.min_order_amount) : null
```

### Environment Variables
```typescript
// ✅ DO: Type environment variables
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID as string;

// ✅ DO: Use environment-specific configuration
logger: {
  level: process.env.NODE_ENV !== "production" ? "debug" : "info",
  disabled: process.env.NODE_ENV === "test",
}

// ✅ DO: Conditional configuration based on environment
advanced: {
  ...(process.env.NODE_ENV === "production" ? {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".meraevents.ai",
    },
  } : {}),
}
```

### Rate Limiting
```typescript
import { rateLimit } from "elysia-rate-limit";

export const UploadAPI = new Elysia({ prefix: "/api/files" })
  .use(
    rateLimit({
      duration: 60000,  // 1 minute
      max: 10,          // 10 requests per minute
      scoping: 'scoped',
      generator: (req, server) => server?.requestIP(req)?.address || "unknown",
    }),
  )
```

### Logging
```typescript
// Application-level logging
import { logger } from "@bogeychan/elysia-logger";

const app = new Elysia()
  .use(
    logger({
      level: "trace",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: true,
          ignore: "pid,hostname",
        },
      },
    }),
  )
```

### File Upload Patterns
```typescript
// Validate file
fileUploadService.validateFile(file);

// Convert to buffer
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// Upload to S3
const result = await fileUploadService.uploadFile(
  buffer,
  file.name,
  file.type,
  folderName || "images",
);
```

---

## Testing Standards

### Test File Organization
```
backend/
├── src/
│   └── modules/
│       └── events/
│           ├── index.ts
│           ├── model.ts
│           ├── service.ts
│           └── __tests__/
│               ├── events.test.ts
│               └── service.test.ts
```

### Writing Tests
```typescript
// TODO: Add testing patterns when test suite is implemented
// Recommended: Use Bun's built-in test runner
// - Unit tests for service layer
// - Integration tests for API endpoints
// - E2E tests for critical flows
```

---

## Performance Best Practices

### Database Optimization
```typescript
// ✅ DO: Select only needed fields
const events = await prisma.event.findMany({
  select: {
    id: true,
    title: true,
    startDateTime: true,
  },
});

// ✅ DO: Use pagination for large datasets
const events = await prisma.event.findMany({
  skip: offset,
  take: limit,
});

// ✅ DO: Use indexes (defined in Prisma schema)
// @@index([categoryId, status])

// ❌ DON'T: Fetch all records without pagination
const allEvents = await prisma.event.findMany();
```


---

## Security Best Practices

### Input Validation
```typescript
// ✅ DO: Always validate input with TypeBox schemas
.post('/create', handler, {
  body: t.Object({
    title: t.String({ minLength: 4, maxLength: 100 }),
    email: t.String({ format: 'email' }),
  })
})

// ✅ DO: Sanitize user input for database queries
if (query.searchQuery) {
  where.title = {
    contains: query.searchQuery,  // Prisma handles SQL injection
    mode: 'insensitive',
  };
}
```

### Authentication & Authorization
```typescript
// ✅ DO: Always check user ownership
const event = await prisma.event.findFirst({
  where: {
    id: eventId,
    owner_id: userId,  // Verify ownership
  },
});

// ✅ DO: Use HTTPS in production
trustedOrigins: ['https://prod.meraevents.ai']

// ✅ DO: Use environment variables for secrets
clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string
```

### CORS Configuration
```typescript
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://meraevents.ai']
      : ['http://localhost:3000'],
    credentials: true,
  }))
```

---

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
GOOGLE_OAUTH_CLIENT_ID="..."
GOOGLE_OAUTH_CLIENT_SECRET="..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="..."
S3_BUCKET_NAME="..."

# Application
NODE_ENV="production"
PORT="3001"
```

---

## Common Patterns & Examples

### Creating a New Module

1. **Create module directory**:
   ```bash
   mkdir -p src/modules/my-feature
   ```

2. **Create `model.ts`**:
   ```typescript
   import { t } from "elysia";
   import { myFeaturePlain } from "@/generated/prismabox/myFeature";

   export const ListMyFeaturesQuery = t.Object({
     page: t.Optional(t.Number({ minimum: 1, default: 1 })),
     limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
   });

   export type ListMyFeaturesQuery = typeof ListMyFeaturesQuery.static;

   export const PaginatedMyFeatureResponse = t.Object({
     items: t.Array(myFeaturePlain),
     totalCount: t.Number(),
     totalPages: t.Number(),
     currentPage: t.Number(),
     hasNextPage: t.Boolean(),
     hasPrevPage: t.Boolean(),
   });

   export type PaginatedMyFeatureResponse = typeof PaginatedMyFeatureResponse.static;
   ```

3. **Create `service.ts`**:
   ```typescript
   import type { Prisma } from "@/generated/prisma";
   import type { ListMyFeaturesQuery, PaginatedMyFeatureResponse } from "./model";
   import { prisma } from "@/database/prisma-client";

   export abstract class MyFeatureService {
     static async listMyFeatures(query: ListMyFeaturesQuery): Promise<PaginatedMyFeatureResponse> {
       const page = query.page ?? 1;
       const limit = query.limit ?? 20;
       const offset = (page - 1) * limit;

       const where: Prisma.myFeatureWhereInput = {
         deleted: false,
       };

       const totalCount = await prisma.myFeature.count({ where });
       const items = await prisma.myFeature.findMany({
         where,
         skip: offset,
         take: limit,
       });

       const totalPages = Math.ceil(totalCount / limit);

       return {
         items,
         totalCount,
         totalPages,
         currentPage: page,
         hasNextPage: page < totalPages,
         hasPrevPage: page > 1,
       };
     }
   }
   ```

4. **Create `index.ts`**:
   ```typescript
   import { Elysia, t } from "elysia";
   import { Auth } from "../auth";
   import { MyFeatureService } from "./service";
   import { ListMyFeaturesQuery, PaginatedMyFeatureResponse } from "./model";

   export const MyFeatureAPIs = new Elysia({ name: "MyFeatureAPIs" })
     .group("/my-features", (app) =>
       app
         .get("", ({ query }) => MyFeatureService.listMyFeatures(query), {
           query: ListMyFeaturesQuery,
           response: { "200": PaginatedMyFeatureResponse },
           detail: {
             summary: "List my features",
             tags: ["My Features"]
           }
         })
         .use(Auth)
         .post('/create', ({ body, user }) => {
           // Implementation
         }, {
           auth: true
         })
     );
   ```

5. **Register in `src/index.ts`**:
   ```typescript
   import { MyFeatureAPIs } from "./modules/my-feature";

   const app = new Elysia()
     .use(MyFeatureAPIs)
     // ... other modules
   ```

---

## Troubleshooting

### Common Issues

#### Prisma Client Not Found
```bash
# Regenerate Prisma Client
bun prisma generate
```

#### TypeBox Schema Errors
```bash
# Regenerate Prismabox schemas
bun prisma generate
```

#### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

#### CORS Errors
```typescript
// Ensure CORS is configured correctly
.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}))
```

---

## Resources

### Official Documentation
- [Elysia.js Documentation](https://elysiajs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Bun Documentation](https://bun.sh/docs)

### Internal Resources
- Swagger UI: `http://localhost:3001/docs`
- Database Schema: `backend/prisma/schema.prisma`
- Generated Types: `backend/generated/`

---

## Changelog

### Version 1.0.0 (Current)
- Initial coding standards document
- Established module architecture patterns
- Defined TypeScript and API conventions
- Documented authentication and authorization patterns
- Added database and Prisma best practices
- Added strict migration policy for Prisma schema changes
- Added group-level params pattern for proper type safety in nested resources

---

## Contributing

When contributing to the backend:

1. **Follow these standards** - All code must adhere to these guidelines
2. **Update documentation** - Keep Swagger docs and JSDoc comments current
3. **Write tests** - Add tests for new features (when test suite is implemented)
4. **Review PRs** - Ensure code reviews check for standard compliance
5. **Update this document** - Propose changes to standards when needed

---

**Last Updated**: 2025-10-28
**Maintained By**: MeraEvents AI Backend Team

