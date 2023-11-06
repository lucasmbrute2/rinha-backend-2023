FROM node:18.12.1-alpine

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start"]