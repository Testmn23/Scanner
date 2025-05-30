FROM node:lts-alpine

# http-server is no longer needed as we use Express.js
# RUN npm install -g http-server

WORKDIR /app

COPY package*.json ./

# Install system dependencies for node-canvas (used by qr-code-styling)
RUN apk add --no-cache build-base python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev ttf-dejavu fontconfig

# Update npm to the latest version
RUN npm install -g npm@latest

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8080

# Run the Express server
CMD [ "node", "api/index.cjs" ]