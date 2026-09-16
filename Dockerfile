# node:24, not 20. Vite 8 needs ^20.19 || >=22.12, which node:20-alpine would
# probably satisfy today -- but `npm ci` installs devDependencies including
# Vitest 5, whose range starts at 22.12. npm only warns rather than failing, and
# shipping a build that depends on npm NOT enforcing a declared engine range is a
# trap for whoever turns on engine-strict later. It also matches the CI job.
FROM node:24-alpine AS builder
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
