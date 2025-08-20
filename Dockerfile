# Use Node.js image
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build production
RUN npm run build

# Expose port
EXPOSE 3000

# Run frontend
CMD ["npm", "run", "start"]
