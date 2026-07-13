# Checklist de entrega (chat Santiago)

## 1) Visuales y contenido IA
- [ ] `src/assets` contiene visuales locales esperadas (hero/placeholders/iconos)
- [ ] Strapi tiene `work-types` cargados (`/strapi/api/work-types` total > 0)
- [ ] Home (`/`) NO muestra "No services available yet"
- [ ] Services (`/services`) NO muestra "No services available yet"

## 2) App objetivo
- [ ] Confirmar con Santiago por mensaje si "la app es ARQ"
- [ ] Si NO es ARQ, actualizar naming/branding/variables antes de deploy

## 3) Infra + smoke
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`
- [ ] `./scripts/smoke-endpoints.sh` sin fallos
- [ ] `pnpm test` OK
- [ ] `ASTRO_TELEMETRY_DISABLED=1 pnpm build` OK

## 4) Publicación
- [ ] Tener cuenta/credenciales de destino
- [ ] Ejecutar deploy
- [ ] Verificar `/`, `/services`, `/strapi/admin/init`
- [ ] Compartir evidencia de cierre (comandos + resultados)

## Comando único sugerido
```bash
./scripts/verify-chat-pending.sh
```
