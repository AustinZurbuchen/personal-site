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

# The commit this image was built from, served as /version.json so cert-check
# can tell from outside whether the NAS runs the image CI last published. The
# bundle hash shows that a build changed, not which commit it came from. After
# everything else that runs, so a SHA that changes on every build invalidates
# only this one layer; a local `docker build` with no --build-arg says "unknown".
ARG GIT_SHA=unknown
RUN printf '{"sha":"%s"}\n' "$GIT_SHA" > /usr/share/nginx/html/version.json

# 8081 is the admin vhost (see nginx.conf). EXPOSE publishes nothing — it is
# metadata — but Unraid's template editor reads it when offering ports, so
# without it 8081 is not offered in the dropdown and has to be typed by hand.
EXPOSE 80 8081
CMD ["nginx", "-g", "daemon off;"]
