# Stage 1: Build the frontend static assets
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup production backend and merge frontend assets
FROM node:18-alpine AS production-server
WORKDIR /usr/src/app

# Copy prisma schema and package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN apk add --no-cache openssl libc6-compat
RUN npm install
RUN npx prisma generate

# Copy the rest of the backend source files
COPY backend/ ./

# Copy built frontend assets to the backend's static directory
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy || npx prisma db push && node src/index.js"]
