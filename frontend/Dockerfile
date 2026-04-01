FROM node:20-alpine

# Working directory inside the container
WORKDIR /app

# Ensure local node bins are available
ENV PATH /app/node_modules/.bin:$PATH

# Install dependencies (use package-lock if present)
COPY package*.json ./
RUN npm ci --silent

# Copy source (mounted as a volume in dev)
COPY . .

EXPOSE 3000

# Start Vite dev server and listen on all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
