# Multi-stage build for optimized production image
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files for dependency installation
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm ci; fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV COGUI_LOG_LEVEL=info

# Create non-root user for security
RUN addgroup -g 1001 -S cogui && \
    adduser -S cogui -u 1001

# Install production dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates && \
    apk upgrade --no-cache

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy static assets and configs
COPY configs/ ./configs/
COPY scripts/ ./scripts/

# Set correct ownership
RUN chown -R cogui:cogui /app

# Switch to non-root user
USER cogui

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Metadata labels
LABEL \
    org.opencontainers.image.title="CogUI Application" \
    org.opencontainers.image.description="Cognitive-Adaptive UI Platform" \
    org.opencontainers.image.vendor="CogUI Team" \
    org.opencontainers.image.url="https://cogui.dev" \
    org.opencontainers.image.documentation="https://docs.cogui.dev" \
    org.opencontainers.image.source="https://github.com/cogui/cogui" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.version="1.0.0" \
    cogui.accessibility.compliant="true" \
    cogui.cognitive.adaptive="true"

# Development stage for local development
FROM node:18-alpine AS development

ENV NODE_ENV=development

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    bash \
    curl \
    vim

# Create non-root user
RUN addgroup -g 1001 -S cogui && \
    adduser -S cogui -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Set ownership
RUN chown -R cogui:cogui /app

USER cogui

# Expose port and debug port
EXPOSE 3000 9229

# Start with nodemon for hot reload
CMD ["npm", "run", "dev"]

# Testing stage for CI/CD
FROM builder AS testing

# Install test dependencies
RUN npm install --include=dev

# Copy test files
COPY tests/ ./tests/
COPY jest.config.js ./
COPY .eslintrc.js ./

# Set test environment
ENV NODE_ENV=test

# Run tests and generate coverage
RUN npm run test -- --coverage --watchAll=false

# Run linting
RUN npm run lint

# Security scanning stage
FROM alpine:latest AS security-scan

# Install security scanning tools
RUN apk add --no-cache \
    curl \
    jq

WORKDIR /app

# Copy application files for security scanning
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Placeholder for security scanning commands
# In real CI/CD, this would run tools like:
# - npm audit
# - snyk test
# - trivy fs
# - hadolint
RUN echo "Security scanning placeholder - implement with actual tools"

# Accessibility testing stage
FROM node:18-alpine AS accessibility-test

WORKDIR /app

# Install accessibility testing tools
RUN npm install -g @axe-core/cli pa11y lighthouse-ci

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install minimal production dependencies for testing
RUN npm ci --only=production

# Expose port for testing
EXPOSE 3000

# Start app in background and run accessibility tests
CMD ["sh", "-c", "node dist/index.js & sleep 5 && npm run test:a11y"]