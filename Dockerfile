FROM node:25-alpine

# Set working directory to backend service
WORKDIR /app/scraper-service

# Copy package files
COPY scraper-service/package*.json ./

# Copy the prisma folder BEFORE npm install so postinstall succeeds
COPY scraper-service/prisma ./prisma

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY scraper-service/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]