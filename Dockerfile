FROM node:20-bookworm

# Create app directory
WORKDIR /usr/src/app

# Install system deps and yt-dlp with Python 3.11
RUN apt-get update && \
    apt-get install -y python3.11 python3-pip ffmpeg && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    pip3 install --no-cache-dir -U yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
