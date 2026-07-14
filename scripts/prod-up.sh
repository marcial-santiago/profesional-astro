#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Create it first:" >&2
  echo "  cp .env.prod.example .env" >&2
  echo "  nano .env" >&2
  exit 1
fi

if grep -q 'CHANGE_ME' .env; then
  echo "Refusing to deploy: .env still contains CHANGE_ME placeholders." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d --build

env_value() {
  key="$1"
  default="$2"
  value="$(grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- || true)"
  if [ -n "$value" ]; then
    printf '%s' "$value"
  else
    printf '%s' "$default"
  fi
}

HTTP_PORT_VALUE="$(env_value HTTP_PORT 80)"
STRAPI_PORT_VALUE="$(env_value STRAPI_PORT 1337)"

echo ""
echo "Production stack started:"
echo "  Frontend: http://localhost:${HTTP_PORT_VALUE}"
echo "  Strapi:   http://localhost:${STRAPI_PORT_VALUE}/admin"
echo ""
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
