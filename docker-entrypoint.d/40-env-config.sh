#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/env-config.js
window.__ENV__ = {
  REACT_APP_SERVER_URL: "${REACT_APP_SERVER_URL:-}",
};
EOF
