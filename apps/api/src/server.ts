import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

export const app = express();
const isProd = env.NODE_ENV === "prod";
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Portl API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: "*",
    }),
  );
}

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ message: "Portl API is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Portl server is healthy", healthy: true });
});

// API docs are dev-only — don't expose the full API surface publicly in production.
if (!isProd) {
  logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
  app.get("/openapi.json", (req, res) => {
    return res.json(openApiDocument);
  });

  logger.debug(`docs: ${env.BASE_URL}/docs`);
  app.use("/docs", apiReference({ url: "/openapi.json" }));
}

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
