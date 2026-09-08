# Build context: monorepo root
# Run: docker build -f apps/website/Dockerfile .

# ---------- Base stage ----------
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
WORKDIR /app

# ---------- Dependencies stage ----------
FROM base AS install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/website/package.json ./apps/website/package.json
COPY packages/constants/package.json ./packages/constants/package.json
# Copy constants source so the workspace symlink resolves at install time
COPY packages/constants/ ./packages/constants/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- Dev stage ----------
FROM install AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 4321
CMD ["pnpm", "--filter", "@startpos/website", "run", "dev", "--host", "0.0.0.0"]

# ---------- Production build ----------
FROM install AS builder
COPY . .
RUN pnpm --filter @startpos/website run build

# ---------- Production runtime (nginx static) ----------
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/website/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
