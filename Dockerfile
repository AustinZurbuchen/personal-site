FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker-entrypoint.d/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-env-config.sh \
  && chmod +x /docker-entrypoint.d/40-env-config.sh
ENV REACT_APP_SERVER_URL=

# 8081 is the admin vhost (see nginx.conf). EXPOSE publishes nothing — it is
# metadata — but Unraid's template editor reads it when offering ports, so
# without it 8081 is not offered in the dropdown and has to be typed by hand.
EXPOSE 80 8081
CMD ["nginx", "-g", "daemon off;"]
