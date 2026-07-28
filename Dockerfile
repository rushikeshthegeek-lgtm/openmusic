FROM node:20-bookworm

# Create app directory
WORKDIR /usr/src/app

# Install system deps and yt-dlp in a dedicated Python virtual environment
RUN apt-get update && \
    apt-get install -y python3 python3-venv python3-pip ffmpeg && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/python -m pip install --upgrade pip yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    \
    echo "=== Versions ===" && \
    node --version && \
    which node && \
    python3 --version && \
    which python3 && \
    yt-dlp --version && \
    which yt-dlp && \
    ffmpeg -version && \
    yt-dlp --js-runtimes node --version

# Make venv binaries available
ENV PATH="/opt/venv/bin:$PATH"

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]