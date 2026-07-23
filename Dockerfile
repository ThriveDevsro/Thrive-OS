FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM dependencies AS build
COPY . .
RUN npx prisma generate && npm run build
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S thrive && adduser -S thrive -G thrive
COPY --from=build --chown=thrive:thrive /app/.next/standalone ./
COPY --from=build --chown=thrive:thrive /app/.next/static ./.next/static
COPY --from=build --chown=thrive:thrive /app/public ./public
USER thrive
EXPOSE 3000
CMD ["node", "server.js"]
