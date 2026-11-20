#!/usr/bin/env bash
# Lädt ein Store-ZIP über die Chrome Web Store API (v2) hoch und reicht es zur Prüfung ein.
# Aufruf: scripts/chrome-store-upload.sh dist/belegtext-<version>-store.zip
# Erwartet die Umgebungsvariablen CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN,
# CWS_PUBLISHER_ID und CWS_ITEM_ID. Einrichtung: store/chrome-web-store-api.md
set -euo pipefail

zip_file="$1"
: "${CWS_CLIENT_ID:?fehlt}" "${CWS_CLIENT_SECRET:?fehlt}" "${CWS_REFRESH_TOKEN:?fehlt}"
: "${CWS_PUBLISHER_ID:?fehlt}" "${CWS_ITEM_ID:?fehlt}"

api="https://chromewebstore.googleapis.com"
item="publishers/${CWS_PUBLISHER_ID}/items/${CWS_ITEM_ID}"
version=$(unzip -p "$zip_file" manifest.json | jq -r .version)

# curl mit Fehlerausgabe: Bei HTTP-Fehlern die Antwort des Servers zeigen, dann abbrechen.
call() {
  local body
  if ! body=$(curl -sS --fail-with-body "$@"); then
    echo "::error::Anfrage fehlgeschlagen: ${body}" >&2
    exit 1
  fi
  printf '%s' "$body"
}

token_response=$(call https://oauth2.googleapis.com/token \
  --data-urlencode "client_id=${CWS_CLIENT_ID}" \
  --data-urlencode "client_secret=${CWS_CLIENT_SECRET}" \
  --data-urlencode "refresh_token=${CWS_REFRESH_TOKEN}" \
  --data-urlencode "grant_type=refresh_token")
token=$(jq -r .access_token <<<"$token_response")
echo "::add-mask::${token}"
auth=(-H "Authorization: Bearer ${token}")

echo "Lade ${zip_file} (Version ${version}) hoch …"
upload=$(call "${auth[@]}" -X POST -T "$zip_file" "${api}/upload/v2/${item}:upload")
echo "$upload"
state=$(jq -r .uploadState <<<"$upload")

# Große Pakete verarbeitet der Store asynchron; dann über fetchStatus warten.
for _ in $(seq 1 30); do
  [ "$state" = "IN_PROGRESS" ] || break
  sleep 10
  status=$(call "${auth[@]}" "${api}/v2/${item}:fetchStatus")
  state=$(jq -r .lastAsyncUploadState <<<"$status")
  echo "Upload-Status: ${state}"
done

if [ "$state" != "SUCCEEDED" ]; then
  echo "::error::Upload nicht erfolgreich (uploadState=${state})"
  exit 1
fi

echo "Reiche zur Prüfung ein …"
publish=$(call "${auth[@]}" -X POST \
  -H "Content-Type: application/json" -d '{"publishType":"DEFAULT_PUBLISH"}' \
  "${api}/v2/${item}:publish")
echo "$publish"
publish_state=$(jq -r .state <<<"$publish")

case "$publish_state" in
  PENDING_REVIEW|PUBLISHED|STAGED) ;;
  *) echo "::error::Einreichen fehlgeschlagen (state=${publish_state})"; exit 1 ;;
esac

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Chrome Web Store"
    echo "Version ${version} eingereicht, Status: \`${publish_state}\`."
    echo "Nach der Freigabe wird sie automatisch veröffentlicht."
    echo "Store-Texte setzt die API nicht: eingereicht wurde, was im Dashboard gespeichert war (Quelle \`store/listing.md\`)."
  } >> "$GITHUB_STEP_SUMMARY"
fi
