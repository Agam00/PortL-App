# syntax=docker/dockerfile:1
# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app
ENV CI=true
RUN corepack enable
# Copy the whole monorepo (workspace package.json files must be present for pnpm)
COPY . .
# Install only the API's dependency subgraph (skips the heavy mobile app deps).
# If this ever errors on the lockfile, use: pnpm install --frozen-lockfile
RUN pnpm install --frozen-lockfile --filter=@repo/api...
# tsup bundles @repo/* + all npm deps into a single self-contained dist/index.js
RUN pnpm --filter @repo/api build

# ---------- runtime stage ----------
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=prod
# dist/ is standalone (index.js + copied .json data files) — no node_modules needed
COPY --from=build /app/apps/api/dist ./dist
# Cloud Run injects PORT=8080; the server reads process.env.PORT
EXPOSE 8080
CMD ["node", "dist/index.js"]
