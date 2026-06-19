#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bego}"
BACK_ROOT="${BACK_ROOT:-$APP_ROOT/Back}"
ENV_FILE="${ENV_FILE:-$BACK_ROOT/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bego}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INCLUDE_ENV="${BACKUP_INCLUDE_ENV:-false}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target_dir="$BACKUP_DIR/$timestamp"
archive="$BACKUP_DIR/bego-backup-$timestamp.tar.gz"

mkdir -p "$target_dir"
chmod 700 "$BACKUP_DIR"

if [[ -z "${MONGO_URI:-}" && -f "$ENV_FILE" ]]; then
  MONGO_URI="$(
    cd "$BACK_ROOT"
    ENV_FILE="$ENV_FILE" node -e '
      const fs = require("fs");
      const dotenv = require("dotenv");
      const values = dotenv.parse(fs.readFileSync(process.env.ENV_FILE));
      process.stdout.write(values.MONGO_URI || "");
    '
  )"
  export MONGO_URI
fi

if [[ -z "${MONGO_URI:-}" ]]; then
  echo "MONGO_URI no esta configurado" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump no esta instalado" >&2
  exit 1
fi

echo "Creando backup MongoDB..."
mongodump --uri="$MONGO_URI" --gzip --archive="$target_dir/mongo.archive.gz"

if [[ -d "$APP_ROOT/downloads" ]]; then
  echo "Empaquetando downloads..."
  tar -C "$APP_ROOT" -czf "$target_dir/downloads.tar.gz" downloads
fi

if [[ "$INCLUDE_ENV" == "true" && -f "$ENV_FILE" ]]; then
  echo "Incluyendo env cifrado localmente no esta habilitado; guardando copia restringida."
  cp "$ENV_FILE" "$target_dir/env.snapshot"
  chmod 600 "$target_dir/env.snapshot"
fi

cat > "$target_dir/manifest.txt" <<MANIFEST
created_at=$timestamp
app_root=$APP_ROOT
mongo=mongodump_archive_gzip
downloads=$([[ -d "$APP_ROOT/downloads" ]] && echo "included" || echo "missing")
env=$([[ "$INCLUDE_ENV" == "true" ]] && echo "included" || echo "excluded")
MANIFEST

tar -C "$BACKUP_DIR" -czf "$archive" "$timestamp"
sha256sum "$archive" > "$archive.sha256"
rm -rf "$target_dir"
chmod 600 "$archive" "$archive.sha256"

find "$BACKUP_DIR" -maxdepth 1 -type f -name "bego-backup-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name "bego-backup-*.tar.gz.sha256" -mtime +"$RETENTION_DAYS" -delete

echo "Backup creado: $archive"
cat "$archive.sha256"
