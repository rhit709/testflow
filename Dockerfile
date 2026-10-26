# Stage 1: build the React frontend
FROM node:20 AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend with the Playwright browser preinstalled
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /frontend/dist /app/frontend/dist
CMD ["node", "server.js"]