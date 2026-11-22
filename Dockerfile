# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

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
FROM nginxinc/nginx-unprivileged:alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
