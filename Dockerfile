# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package*.json ./
# npm ci installs exactly what package-lock.json pins; --ignore-scripts keeps
# dependency lifecycle scripts from running during the build.
RUN npm ci --no-fund --ignore-scripts

COPY . .

# Image tag passed in by deploy-vespa-telemetry.sh; shown in the About dialog.
ARG VITE_APP_VERSION=dev
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
# Unprivileged nginx: runs as user nginx (uid 101) and listens on 8080.
FROM nginxinc/nginx-unprivileged:alpine@sha256:b9241c6e7b8e9a862f129d8d4199ab64b10390949a78bdd5603379b32c844083

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
