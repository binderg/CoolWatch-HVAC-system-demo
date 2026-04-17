# =============================================================================
# STAGE 1: builder
# Purpose: install ALL dependencies (including dev tools) and compile TypeScript
# =============================================================================
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy only package files first.
# Docker caches each step — if package.json hasn't changed, it won't
# re-run npm install on the next build. This makes rebuilds much faster.
COPY package*.json ./

# Install all dependencies (including devDependencies like @nestjs/cli)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Compile TypeScript → JavaScript (output goes to /app/dist)
RUN npm run build


# =============================================================================
# STAGE 2: production
# Purpose: create a lean final image with only what's needed to RUN the app
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files again (needed to install prod deps)
COPY package*.json ./

# Install ONLY production dependencies — no TypeScript compiler, no NestJS CLI, etc.
# This keeps the image small and reduces the attack surface.
RUN npm ci --only=production

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Tell Docker that this container listens on port 3001
EXPOSE 3001

# The command that runs when the container starts
CMD ["node", "dist/main"]
