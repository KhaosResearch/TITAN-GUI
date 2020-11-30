# Stage 1: Building the code
FROM mhart/alpine-node AS builder

WORKDIR /app

COPY package.json ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn install --production --frozen-lockfile

# Stage 2: And then copy over node_modules, etc from that stage to the smaller base image
FROM mhart/alpine-node:15 as production

WORKDIR /app

COPY index.js ./
COPY public ./public

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "index.js"]