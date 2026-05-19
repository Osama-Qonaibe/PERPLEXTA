# Dockerfile for Perplexta AI Platform
FROM node:22-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

# Build the frontend assets
RUN npm run build

EXPOSE 3000

# Start command
CMD ["npm", "start"]
