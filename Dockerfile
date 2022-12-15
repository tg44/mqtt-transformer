FROM node:16-alpine3.12

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
RUN npm install
USER node
COPY --chown=node:node . .
RUN npx tsc

CMD [ "node", "build/app.js" ]
