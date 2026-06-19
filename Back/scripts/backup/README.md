# BeGO production backups

Run on the production server:

```bash
cd /var/www/bego
bash Back/scripts/backup/backup-production.sh
```

Recommended cron:

```cron
20 3 * * * cd /var/www/bego && BACKUP_DIR=/var/backups/bego bash Back/scripts/backup/backup-production.sh >> /var/log/bego/backup.log 2>&1
```

The script creates:
- `mongo.archive.gz` using `mongodump --gzip --archive`.
- `downloads.tar.gz` for APK/public downloads.
- `manifest.txt`.
- A final `bego-backup-*.tar.gz` plus `.sha256`.

The `.env` file is parsed with `dotenv`; it is never executed as a shell
script, so passwords and values containing spaces remain safe.

By default `.env` is excluded. To include it in a restricted backup:

```bash
BACKUP_INCLUDE_ENV=true bash Back/scripts/backup/backup-production.sh
```

Keep at least one off-server copy. A backup is not complete until restore has been tested.
