FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY prisma ./prisma/

# Generate prisma client
RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start"]
