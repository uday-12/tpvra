import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";

const EnvironmentSchema = t.Object({
  PORT: t.Number({ default: 3001 }),
  NODE_ENV: t.String({ default: "development" }),
  DATABASE_URL: t.String(),
  BETTER_AUTH_LOGLEVEL: t.String(),
  SENTRY_DSN: t.Optional(t.String()),
  SENTRY_RELEASE: t.Optional(t.String()),
  SENTRY_TRACES_SAMPLE_RATE: t.Optional(t.Number()),
});

export type Environment = typeof EnvironmentSchema.static;

let loadedEnv: Environment | undefined;

export function loadEnvironment(): Environment {
  if (loadedEnv) {
    return loadedEnv;
  }

  const env = {
    
    PORT: parseInt(process.env.PORT || "3001", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_LOGLEVEL: process.env.BETTER_AUTH_LOGLEVEL || "debug",
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : undefined,
  };

  const result = Value.Decode(EnvironmentSchema, env);

  if (!Value.Check(EnvironmentSchema, result)) {
    const errors = [...Value.Errors(EnvironmentSchema, result)];
    throw new Error(
      `Environment validation failed: ${errors.map((e) => e.message).join(", ")}`,
    );
  }

  loadedEnv = result;
  return result;
}

/**
 * Defining env is two step process.
 * 1. Define env key in EnvironmentSchema to parse its type.
 * 2. get the value in env variable inside the loadEnvironment function
 */
export const env = loadEnvironment();
