# Image du serveur de jeu Ronda Dyalna : sert aussi la version web du jeu.
#   docker build -t ronda .
#   docker run -p 8080:8080 -v ronda-data:/data ronda

FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY core/package.json core/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci --ignore-scripts
COPY core core
COPY server server
COPY app app
COPY tsconfig.base.json ./
# Adresse WebSocket publique compilée dans la version web (vide : même domaine que la page).
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN npm run build -w @ronda/app && npm run build -w @ronda/server

FROM node:22-alpine
WORKDIR /srv
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/srv/public
COPY --from=build /repo/server/dist/server.js ./server.js
COPY --from=build /repo/app/dist ./public
RUN mkdir -p /data && chown -R node:node /data /srv
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
