# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=frontend /app/client/dist ./client/dist

EXPOSE 3001
WORKDIR /app/server
CMD ["node", "index.js"]
