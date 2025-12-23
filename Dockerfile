# Use official Node.js runtime as base image
# Using slim variant instead of alpine for better compatibility with native modules
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies for native modules and other tools
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    python3 \
    python3-venv \
    python3-pip \
    make \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Download and install ngrok
RUN curl -LO https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz && \
    tar xzf ngrok-v3-stable-linux-amd64.tgz -C /usr/local/bin && \
    rm ngrok-v3-stable-linux-amd64.tgz

# Copy frontend package files first
COPY frontend/package*.json /tmp/frontend/

# Install frontend dependencies and build
WORKDIR /tmp/frontend
RUN npm install

# Copy frontend source code
COPY frontend/ /tmp/frontend/

# Build the frontend
RUN npm run build

# Switch back to app directory for backend
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies with proper build tools
RUN npm install --save-dev node-gyp && npm install

# Copy backend source code
COPY backend/ .

# Copy the built frontend to the correct location (../frontend/build relative to backend)
RUN mkdir -p ../frontend/build
RUN cp -r /tmp/frontend/build/* ../frontend/build/

# Copy ML directory and install Python dependencies
COPY ml/ ../ml/
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --upgrade pip && \
    /app/venv/bin/pip install scikit-learn==1.7.2 joblib pandas numpy

# Expose port
EXPOSE 5001

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
