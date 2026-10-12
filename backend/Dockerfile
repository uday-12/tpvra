FROM oven/bun:1

WORKDIR /app

# Copy dependency files first (better caching)
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Generate Prisma client
RUN bunx prisma generate

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "await fetch('http://localhost:3001/healthz').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Run migrations and start app
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/index.ts"]