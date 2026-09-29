FROM node:20-slim

WORKDIR /app

# Install curl for healthchecks
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]
