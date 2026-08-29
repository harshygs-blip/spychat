FROM node:20-alpine AS builder

WORKDIR /app

# Copy server dependency definitions
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy server source and compile TypeScript
COPY server/ ./
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5001

# Install production dependencies
COPY --from=builder /app/server/package*.json ./
RUN npm install --only=production

# Copy compiled JavaScript and initial data
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/data ./data

EXPOSE 5001

CMD ["node", "dist/server.js"]
