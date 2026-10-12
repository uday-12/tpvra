FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

ARG NEXT_PUBLIC_BACKEND_URL
ARG BETTER_AUTH_URL

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL

COPY . .

EXPOSE 3000

RUN npm run build

CMD ["npm", "run", "start"]
