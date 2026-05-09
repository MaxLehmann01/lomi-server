FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci --no-cache
RUN npm install -g nodemon
COPY . .
ENV NODE_ENV=development
CMD ["sh", "-c", "npx nodemon"]