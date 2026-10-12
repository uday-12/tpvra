import { auth } from "@/lib/auth";
// import { logger } from "@/lib/common/logger";
import Elysia from "elysia";

export const Auth = new Elysia({ name: "AuthAPIs" }).mount(auth.handler).macro({
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
