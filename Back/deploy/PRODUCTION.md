# BeGO production deploy

Domain: `bego.com.ht`
Origin public IPv4: `159.223.117.72`
App port: `3000`

## Cloudflare

Set these DNS records:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `@` | `159.223.117.72` | Proxied |
| A | `www` | `159.223.117.72` | Proxied |

Use SSL/TLS mode `Full` or `Full (strict)` once the server has a valid certificate. Enable WebSockets.

## Server packages

```bash
sudo apt update
sudo apt install -y nginx git nodejs npm redis-server
sudo npm install -g pm2
```

Install MongoDB separately if it is not already running.

## App setup

```bash
sudo mkdir -p /var/www/bego /var/log/bego
sudo chown -R $USER:$USER /var/www/bego /var/log/bego
cd /var/www/bego
git clone <YOUR_REPO_URL> .
cd Back
npm ci --omit=dev
cp .env.production.example .env
nano .env
```

Put the real production secrets in `.env`.

## Start with PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

## Nginx

```bash
sudo cp deploy/nginx-bego.com.ht.conf /etc/nginx/sites-available/bego.com.ht
sudo ln -s /etc/nginx/sites-available/bego.com.ht /etc/nginx/sites-enabled/bego.com.ht
sudo nginx -t
sudo systemctl reload nginx
```

## Fix Cloudflare 521 checklist

```bash
pm2 status
pm2 logs bego-api --lines 80
curl -i http://127.0.0.1:3000/healthz
curl -i http://159.223.117.72/healthz
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

If `127.0.0.1:3000/healthz` works but the public IP fails, check Nginx and firewall. If both work but Cloudflare still shows 521, confirm Cloudflare DNS points to `159.223.117.72` and that the orange cloud is not using an old origin.
