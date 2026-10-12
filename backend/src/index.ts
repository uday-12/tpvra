import { Elysia } from "elysia";
import * as Sentry from "@sentry/bun";
import { SwaggerConfig } from "./config/swagger";
import { loggerConfig } from "./lib/common/logger";
import { auth } from "./lib/auth";
import { env } from "./environment";
import { cors } from "@elysiajs/cors";
import { logger } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { CategoryAPIs } from "./modules/categories";
import { QuestionAPIs } from "./modules/questions";
import { AssessmentAPIs } from "./modules/assessments";
import { AssessorVendorAssessmentAPIs } from "./modules/assessor-vendor-assessments";
import { UploadAPI } from "./modules/upload-file";
import { ClarificationAPIs } from "./modules/clarifications";
import { PaymentAPIs } from "./modules/payments";
import { DashboardAPIs } from "./modules/dashboard";
import { UsersAPIs } from "./modules/users";
import { healthcheckPlugin } from "elysia-healthcheck";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    tracesSampler: () => env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
    initialScope: (scope) => {
      scope.setTag("service", "Backend");
      return scope;
    },
  });
}

const captureUnhandledError = (error: unknown, context: string) => {
  if (env.SENTRY_DSN) {
    Sentry.captureException(error);
  } else {
    console.error(`[${context}]`, error);
  }
};

// Handle unhandled rejection and uncaught exception regardless of Sentry config
process.on("unhandledRejection", (reason) => {
  captureUnhandledError(reason, "unhandledRejection");
});

process.on("uncaughtException", (err) => {
  captureUnhandledError(err, "uncaughtException");
});

const allowedCorsOrigins = ["https://tpvra.com"];
if (env.NODE_ENV !== "production") {
  allowedCorsOrigins.push("http://localhost:3000");
}
// user middleware (compute user and session and pass to routes)
const betterAuth = new Elysia({ name: "better-auth" })
  .use(
    cors({
      origin: allowedCorsOrigins,
      credentials: true,
    }),
  )
  .use(healthcheckPlugin())
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) return status(401);

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

export const app = new Elysia()
  .use(logger(loggerConfig))
  .use(betterAuth)
  .use(SwaggerConfig)
  .use(openapi())
  .use(CategoryAPIs)
  .use(QuestionAPIs)
  .use(AssessmentAPIs)
  .use(AssessorVendorAssessmentAPIs)
  .use(UploadAPI)
  .use(ClarificationAPIs)
  .use(PaymentAPIs)
  .use(DashboardAPIs)
  .use(UsersAPIs)


app.listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}
      Docs: http://${app.server?.hostname}:${app.server?.port}/docs
  `,
);
