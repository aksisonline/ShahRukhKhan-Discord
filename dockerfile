# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install FFmpeg and basic dependencies
RUN apk update && apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    git

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json 
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Create config.json if it doesn't exist
RUN if [ ! -f config.json ]; then echo '{"userAudio":{}}' > config.json; fi

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node --version || exit 1

# Define the command to run the app
CMD ["node", "--loader", "ts-node/esm", "bot.ts"]
