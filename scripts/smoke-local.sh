#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
EMAIL="smoke.$(date +%s)@example.com"
PASSWORD="local-smoke-password"

post_json() {
  local url="$1"
  local body="$2"
  local auth_header="${3:-}"

  if [[ -n "$auth_header" ]]; then
    curl -sS -f -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $auth_header" \
      -d "$body"
  else
    curl -sS -f -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$body"
  fi
}

extract_json() {
  local json="$1"
  local path="$2"
  node -e '
const input = process.argv[1];
const path = process.argv[2].split(".");
const data = JSON.parse(input);
let cur = data;
for (const key of path) {
  if (!key) continue;
  cur = cur?.[key];
}
if (cur === undefined || cur === null) process.exit(1);
if (typeof cur === "object") {
  console.log(JSON.stringify(cur));
} else {
  console.log(String(cur));
}
' "$json" "$path"
}

echo "[smoke] Base URL: $BASE_URL"
echo "[smoke] Signing up local user: $EMAIL"
AUTH_JSON="$(post_json "$BASE_URL/api/auth/local" "{\"mode\":\"signup\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
TOKEN="$(extract_json "$AUTH_JSON" "session.access_token")"

if [[ -z "$TOKEN" ]]; then
  echo "[smoke] failed: auth token missing"
  exit 1
fi

echo "[smoke] Creating conversation"
CONV_JSON="$(post_json "$BASE_URL/api/conversations" "{\"type\":\"VALUES_DISCOVERY\",\"title\":\"Smoke Test\"}" "$TOKEN")"
CONVERSATION_ID="$(extract_json "$CONV_JSON" "conversation.id")"
FIRST_MESSAGE="$(extract_json "$CONV_JSON" "conversation.messages.0.content")"

if [[ -z "$CONVERSATION_ID" ]]; then
  echo "[smoke] failed: conversation id missing"
  exit 1
fi

echo "[smoke] First assistant message: $FIRST_MESSAGE"

echo "[smoke] Sending follow-up message"
MSG_JSON="$(post_json "$BASE_URL/api/conversations/$CONVERSATION_ID/messages" "{\"content\":\"Smoke test message\"}" "$TOKEN")"
ASSISTANT_REPLY="$(extract_json "$MSG_JSON" "message")"

if [[ -z "$ASSISTANT_REPLY" ]]; then
  echo "[smoke] failed: assistant reply missing"
  exit 1
fi

echo "[smoke] Assistant reply: $ASSISTANT_REPLY"
echo "[smoke] PASS"
