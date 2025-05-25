FROM node:lts-alpine

# http-server is no longer needed as we use Express.js
# RUN npm install -g http-server 

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8080

# Run the Express server
CMD [ "node", "api/index.js" ]