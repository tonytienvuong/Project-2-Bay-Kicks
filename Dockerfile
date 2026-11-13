# Dockerfile — the one image Cloud Run runs (CS351 Project 2).

# Stage 1: build the React app. Vite and the React plugin are dev dependencies,
# so this stage installs everything, runs `npm run build`, and keeps client/dist.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client ./client
COPY server ./server
RUN npm run build

# Stage 2: what actually ships. Only production dependencies, the Express server,
# and the built React files — no source for the client, no dev dependencies.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist

# Cloud Run sends traffic to $PORT; 8080 is its default.
ENV PORT=8080
EXPOSE 8080

# server.js reads MONGODB_URI, MONGODB_DB and SESSION_SECRET from the environment —
# they are set on the Cloud Run service, never baked into this image.
CMD ["node", "server/server.js"]
