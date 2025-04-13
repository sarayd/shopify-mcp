FROM node:18.18-alpine

# Add labels for better maintainability
LABEL maintainer="Shopify MCP Maintainers"
LABEL description="Shopify MCP Server for interacting with Shopify API"

# Set working directory
WORKDIR /app

# Install dependencies for potential healthcheck
RUN apk --no-cache add curl

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with proper error handling
RUN npm install --production --no-optional --loglevel=error || \
    (echo "Failed to install dependencies" && exit 1)

# Copy only necessary files
COPY tsconfig.json ./
COPY src ./src

# Build the application with proper error handling
RUN npm run build || (echo "Build failed" && exit 1)

# Verify the build was successful
RUN test -d ./dist || (echo "Build verification failed - dist directory not found" && exit 1)

# Add healthcheck to ensure the container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production

# Clean up to reduce image size
RUN npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Set user to non-root for security
USER node

# Command will be provided by smithery.yaml
CMD ["node", "dist/index.js"]
