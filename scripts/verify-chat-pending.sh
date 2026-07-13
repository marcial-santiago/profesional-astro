#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }

if [ ! -f .env ]; then
  echo "Missing .env (copy from .env.prod.example first)." >&2
  exit 1
fi

step "Levantar stack Docker"
$COMPOSE up -d --build

step "Esperar servicios"
$COMPOSE ps

step "Verificar si hay servicios en Strapi"
COUNT_JSON="$(curl -g -s "http://localhost:${HTTP_PORT:-8080}/strapi/api/work-types?pagination[pageSize]=1")"
TOTAL="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(d.get("meta",{}).get("pagination",{}).get("total",0))' "$COUNT_JSON" 2>/dev/null || echo 0)"
echo "Work types actuales: $TOTAL"

if [ "$TOTAL" = "0" ]; then
  step "Seed de Strapi (work-types/blog/availability/messages/visits)"
  docker cp strapi/seed-strapi.js profesional-astro-strapi:/app/strapi/seed-strapi.js
  if ! $COMPOSE exec -T strapi node /app/strapi/seed-strapi.js; then
    warn "Falló seed-strapi.js dentro de contenedor; revisá logs de strapi y DB."
    exit 1
  fi
else
  echo "Ya hay contenido en Strapi, no se ejecuta seed."
fi

step "Smoke tests HTTP"
./scripts/smoke-endpoints.sh

step "Validar que home/services muestren contenido"
HOME_HTML="$(curl -s "http://localhost:${HTTP_PORT:-8080}/")"
SERVICES_HTML="$(curl -s "http://localhost:${HTTP_PORT:-8080}/services")"

if echo "$HOME_HTML" | grep -q "No services available yet"; then
  echo "❌ Home sigue sin servicios" >&2
  exit 1
fi
if echo "$SERVICES_HTML" | grep -q "No services available yet"; then
  echo "❌ /services sigue sin servicios" >&2
  exit 1
fi

echo "✅ Verificación completada: hay contenido y endpoints responden."

echo "\nSugerencia deploy:\n  1) Confirmar cuenta/credenciales de destino\n  2) docker compose -f docker-compose.prod.yml up -d --build\n  3) ./scripts/smoke-endpoints.sh\n  4) Compartir evidencia (HTTP 200 + capturas de home/services)"
