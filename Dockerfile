FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
COPY admin/ admin/
COPY pb_migrations/ pb_migrations/
COPY pb_public/ pb_public/

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache tini
ARG DENO_VERSION=2.1.4
ARG DENO_SHA256=8f02e25c18e2c36513e948e45e5085df41a7e6d48c3e6acd3bf1013e12d560b6
RUN apk add --no-cache curl unzip \
    && curl -fsSL -o /tmp/deno.zip \
    "https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip" \
    && echo "${DENO_SHA256}  /tmp/deno.zip" | sha256sum -c - \
    && unzip -o /tmp/deno.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/deno \
    && rm /tmp/deno.zip \
    && deno --version \
    && apk del curl unzip

WORKDIR /app

COPY --from=builder /app/dist dist/
COPY --from=builder /app/pb_public pb_public/
COPY --from=builder /app/pb_migrations pb_migrations/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ./

COPY src/tools/jsvm/deno_worker.ts dist/tools/jsvm/deno_worker.ts

EXPOSE 8090

VOLUME ["/app/pb_data"]

ENV SOLARCH_DATA_DIR=/app/pb_data
ENV JSVM_SANDBOX_MODE=legacy

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/cli.js", "serve", "--port", "8090", "--dir", "/app/pb_data"]
