FROM node:20-alpine
WORKDIR /app

# Build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Persistent data dir
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV LOCAL_DEV=true
ENV DB_PATH=/app/data/etson-local.db

EXPOSE 3001
CMD ["node", "src/index.js"]
