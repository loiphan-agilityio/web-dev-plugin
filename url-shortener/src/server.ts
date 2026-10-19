import { buildApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 3000);
const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

const app = await buildApp(openDb(process.env.DB_PATH ?? 'data.db'), baseUrl, corsOrigins, { logger: true });
await app.listen({ port });
