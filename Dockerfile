# credx.co.uk: Astro, every page prerendered, plus one on-demand route (/api/enquiry/, the form)
# on the Node adapter. Same shape as the Madhouse sites.
#
# Coolify: Build Pack = Dockerfile, Base Directory = /, Port = 4321, and a Volume Mount at /data
# (the enquiry log). Environment variables: see .env.example and DEPLOY-COOLIFY.md.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
# HOST must be 0.0.0.0: bound to localhost, Traefik can't reach the app and the domain answers 502
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 ENQUIRY_LOG_DIR=/data
RUN apk add --no-cache su-exec
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4321/ || exit 1
# the entrypoint makes /data writable, then runs node as the unprivileged `node` user (PID 1,
# so Coolify's stop signal reaches it)
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
