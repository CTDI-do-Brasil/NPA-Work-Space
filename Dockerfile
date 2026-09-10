# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Backend and Combined Production Server
# ==========================================
FROM node:20-bookworm-slim
WORKDIR /app/backend

# Install production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy compiled frontend from Stage 1 to public/ directory
COPY --from=frontend-builder /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["node", "server.js"]
