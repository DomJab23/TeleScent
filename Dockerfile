# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json files for both frontend and backend
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --only=production

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install
COPY frontend/ .
RUN npm run build

# Copy backend source code
WORKDIR /app
COPY backend/ ./backend/

# Set working directory to backend for running the server
WORKDIR /app/backend

# Expose the port the app runs on
EXPOSE 5000

# Start the backend server (which now serves the frontend too)
CMD ["npm", "start"]