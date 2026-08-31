# Frontend Docker for deployment
FROM node:18-alpine as builder

WORKDIR /app

COPY apps/web/package*.json ./
RUN npm ci

# Build with production API URL
ENV NEXT_PUBLIC_API_URL=https://paisamate-api.onrender.com/api
COPY apps/web .
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy built app and node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
