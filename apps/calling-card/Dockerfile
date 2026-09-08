# Build context: monorepo root
# Run: docker build -f apps/calling-card/Dockerfile .

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
COPY apps/calling-card/package.json ./apps/calling-card/package.json
COPY packages/constants/package.json ./packages/constants/package.json
# Copy constants source so the workspace symlink resolves at install time
COPY packages/constants/ ./packages/constants/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- Dev stage ----------
FROM install AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 3005
CMD ["pnpm", "--filter", "@startpos/calling-card", "run", "dev:docker"]

# ---------- Production build ----------
FROM install AS builder
COPY . .
RUN pnpm --filter @startpos/calling-card run build

# ---------- Production runtime (nginx static) ----------
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/calling-card/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
