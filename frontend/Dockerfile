FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# In dev we run vite
CMD ["npm", "run", "dev"]
