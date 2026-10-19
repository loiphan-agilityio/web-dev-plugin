# url-shortener

URL shortener API: Fastify 5 + TypeScript + SQLite (`node:sqlite`), with Swagger docs.
Node 24 runs the `.ts` files directly (type stripping), so there is no build step.

```sh
pnpm install
pnpm dev        # http://localhost:3000, Swagger UI at /docs, OpenAPI JSON at /docs/json
pnpm test       # node:test + app.inject(), in-memory DB
pnpm typecheck
```

| Env | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `DB_PATH` | `data.db` | SQLite file, created on first run |
| `BASE_URL` | `http://localhost:$PORT` | Prefix for `shortUrl` in responses |
| `CORS_ORIGINS` | _(empty: CORS off)_ | Comma-separated origins allowed to call the API from a browser, e.g. `https://app.example.com,http://localhost:5173` |

## Auth

Users register and log in with email + password. Both return `{ token, expiresAt }`. Every other `/api/*` call needs
`Authorization: Bearer <token>`; otherwise it gets 401. `/:code` redirects and `/docs` are public.

| Method | Path | |
|---|---|---|
| POST | `/api/auth/register` | `{ email, password }` → 201 and logs you in. 409 if the email is taken (case-insensitive) |
| POST | `/api/auth/login` | `{ email, password }` → 200. 401 for a wrong email or password |
| POST | `/api/auth/logout` | 204. That token stops working; other sessions stay logged in |

A token lasts 30 days. Passwords are 8–128 chars, stored as scrypt hashes; tokens are stored as SHA-256 hashes.
Each link belongs to the user who created it. A user only lists, reads and deletes their own links, and another
user's link returns 404. Aliases are still global, so an alias taken by any user returns 409.

`data.db` files from the API-key version are refused at startup: delete the file and start again.

## API

| Method | Path | |
|---|---|---|
| POST | `/api/links` | `{ url, alias?, expiresAt? }` → 201. 409 if the alias is taken |
| GET | `/api/links?limit=20&offset=0` | Your links as `{ items, total }`, newest first |
| GET | `/api/links/:code` | Your link with its click count |
| DELETE | `/api/links/:code` | 204 |
| GET | `/:code` | 302 to the URL and counts the click. 410 once expired. No login needed |

```sh
TOKEN=$(curl -s -X POST localhost:3000/api/auth/register -H 'content-type: application/json' \
  -d '{"email":"alice@example.com","password":"correct horse"}' | jq -r .token)
curl -X POST localhost:3000/api/links -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"url":"https://example.com","alias":"demo"}'
curl -i localhost:3000/demo
```

Rules: `url` must be `http(s)://`, `alias` is 3–32 of `A-Z a-z 0-9 _ -` (not `api`/`docs`), `expiresAt` is
ISO 8601 and must be in the future.
