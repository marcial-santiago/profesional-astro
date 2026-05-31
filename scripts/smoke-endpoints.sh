#!/usr/bin/env bash
set -u

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

env_value() {
  local key="$1"
  local default="$2"
  local value=""

  if [ -f .env ]; then
    value="$(grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- || true)"
  fi

  if [ -n "$value" ]; then
    printf '%s' "$value"
  else
    printf '%s' "$default"
  fi
}

HTTP_PORT="$(env_value HTTP_PORT 80)"
STRAPI_PORT="$(env_value STRAPI_PORT 1337)"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:${HTTP_PORT}}"
STRAPI_URL="${STRAPI_URL_SMOKE:-http://localhost:${STRAPI_PORT}}"
ORIGIN="${ORIGIN:-${FRONTEND_URL}}"
TIMEOUT="${TIMEOUT:-10}"

PASS=0
FAIL=0
SKIP=0
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="${TMP_DIR}/cookies.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

green() { printf '\033[32m%s\033[0m' "$*"; }
red() { printf '\033[31m%s\033[0m' "$*"; }
yellow() { printf '\033[33m%s\033[0m' "$*"; }

record_pass() {
  PASS=$((PASS + 1))
  printf '%s %s\n' "$(green PASS)" "$1"
}

record_fail() {
  FAIL=$((FAIL + 1))
  printf '%s %s\n' "$(red FAIL)" "$1"
}

record_skip() {
  SKIP=$((SKIP + 1))
  printf '%s %s\n' "$(yellow SKIP)" "$1"
}

http_request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local headers_file="${TMP_DIR}/headers.txt"
  local body_file="${TMP_DIR}/body.txt"
  local code

  if [ "$method" = "GET" ]; then
    code="$(
      curl -sS -L \
        --connect-timeout "$TIMEOUT" \
        --max-time "$TIMEOUT" \
        -c "$COOKIE_JAR" \
        -b "$COOKIE_JAR" \
        -D "$headers_file" \
        -o "$body_file" \
        -w '%{http_code}' \
        "$url" 2>"${TMP_DIR}/curl.err"
    )"
  else
    code="$(
      curl -sS -L \
        --connect-timeout "$TIMEOUT" \
        --max-time "$TIMEOUT" \
        -c "$COOKIE_JAR" \
        -b "$COOKIE_JAR" \
        -D "$headers_file" \
        -o "$body_file" \
        -w '%{http_code}' \
        -X "$method" \
        -H "Content-Type: application/json" \
        -H "Origin: ${ORIGIN}" \
        --data "$body" \
        "$url" 2>"${TMP_DIR}/curl.err"
    )"
  fi

  if [ -s "${TMP_DIR}/curl.err" ]; then
    printf 'CURL_ERROR:%s' "$(cat "${TMP_DIR}/curl.err")"
    return 0
  fi

  printf '%s' "$code"
}

expect_status() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected="$4"
  local body="${5:-}"
  local code

  code="$(http_request "$method" "$url" "$body")"

  if [[ "$code" == CURL_ERROR:* ]]; then
    record_fail "${label} -> ${url} (${code#CURL_ERROR:})"
    return
  fi

  if [[ "$expected" == *","* ]]; then
    if [[ ",${expected}," == *",${code},"* ]]; then
      record_pass "${label} -> HTTP ${code}"
    else
      record_fail "${label} -> HTTP ${code}, expected one of ${expected}"
      sed -n '1,8p' "${TMP_DIR}/body.txt" | sed 's/^/    body: /'
    fi
    return
  fi

  if [ "$code" = "$expected" ]; then
    record_pass "${label} -> HTTP ${code}"
  else
    record_fail "${label} -> HTTP ${code}, expected ${expected}"
    sed -n '1,8p' "${TMP_DIR}/body.txt" | sed 's/^/    body: /'
  fi
}

expect_body() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local expected_text="$5"
  local code

  code="$(http_request "$method" "$url")"

  if [[ "$code" == CURL_ERROR:* ]]; then
    record_fail "${label} -> ${url} (${code#CURL_ERROR:})"
    return
  fi

  if [ "$code" != "$expected_status" ]; then
    record_fail "${label} -> HTTP ${code}, expected ${expected_status}"
    return
  fi

  if grep -q "$expected_text" "${TMP_DIR}/body.txt"; then
    record_pass "${label} -> HTTP ${code}, body contains '${expected_text}'"
  else
    record_fail "${label} -> HTTP ${code}, body missing '${expected_text}'"
    sed -n '1,8p' "${TMP_DIR}/body.txt" | sed 's/^/    body: /'
  fi
}

json_get_work_type_id() {
  python3 - "$1" <<'PY'
import json
import sys
from pathlib import Path

try:
    payload = json.loads(Path(sys.argv[1]).read_text())
    data = payload.get("data") or []
    if data:
        print(data[0].get("id", ""))
except Exception:
    pass
PY
}

future_date() {
  if date -d tomorrow +%F >/dev/null 2>&1; then
    date -d tomorrow +%F
  else
    python3 - <<'PY'
from datetime import date, timedelta
print((date.today() + timedelta(days=1)).isoformat())
PY
  fi
}

printf '\nSmoke testing endpoints\n'
printf '  Frontend: %s\n' "$FRONTEND_URL"
printf '  Strapi:   %s\n' "$STRAPI_URL"
printf '  Origin:   %s\n\n' "$ORIGIN"

# Frontend / Nginx
expect_status "Frontend home" GET "${FRONTEND_URL}/" 200
expect_body "Nginx health" GET "${FRONTEND_URL}/healthz" 200 "ok"
expect_status "Services page" GET "${FRONTEND_URL}/services" 200
expect_status "Blog page" GET "${FRONTEND_URL}/blog" "200,404"
expect_status "Checkout page" GET "${FRONTEND_URL}/checkout" 200

# Astro API proxy endpoints
expect_status "Astro work types API" GET "${FRONTEND_URL}/api/work-types" 200
WORK_TYPE_ID="$(json_get_work_type_id "${TMP_DIR}/body.txt")"

if [ -n "$WORK_TYPE_ID" ]; then
  TEST_DATE="$(future_date)"
  expect_status "Astro slots API" GET "${FRONTEND_URL}/api/work-types/slots?date=${TEST_DATE}&workTypeId=${WORK_TYPE_ID}" 200
else
  record_skip "Astro slots API -> no work type returned by /api/work-types"
fi

expect_status "Astro slots validation" GET "${FRONTEND_URL}/api/work-types/slots?date=not-a-date&workTypeId=abc" 400
expect_status "Contact validation" POST "${FRONTEND_URL}/api/contact" 400 '{}'
expect_status "Visits CSRF protection" POST "${FRONTEND_URL}/api/visits" 401 '{"nombre":"John Smith"}'
expect_status "Stripe checkout CSRF protection" POST "${FRONTEND_URL}/api/stripe/create-checkout-session" 401 '{"workTypeName":"Test"}'
expect_status "Verify payment validation" GET "${FRONTEND_URL}/api/verify-payment?session_id=bad" 400

# Strapi direct
expect_status "Strapi admin init direct" GET "${STRAPI_URL}/admin/init" 200
expect_status "Strapi work types direct" GET "${STRAPI_URL}/api/work-types" 200
expect_status "Strapi blog posts direct" GET "${STRAPI_URL}/api/blog-posts" 200

# Strapi through Nginx same-origin proxy
expect_status "Strapi admin init via Nginx" GET "${FRONTEND_URL}/strapi/admin/init" 200
expect_status "Strapi work types via Nginx" GET "${FRONTEND_URL}/strapi/api/work-types" 200

printf '\nSummary: '
printf '%s passed, ' "$(green "$PASS")"
printf '%s failed, ' "$(red "$FAIL")"
printf '%s skipped\n' "$(yellow "$SKIP")"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
