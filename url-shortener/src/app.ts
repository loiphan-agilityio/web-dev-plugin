import type { DatabaseSync } from 'node:sqlite';
import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { routes } from './routes.ts';

export async function buildApp(db: DatabaseSync, baseUrl: string, corsOrigins: string[] = [], options: FastifyServerOptions = {}) {
  const app = Fastify(options).withTypeProvider<TypeBoxTypeProvider>();

  // Off unless origins are listed. No credentials mode: the session token travels in a header, not a cookie.
  if (corsOrigins.length) {
    await app.register(cors, {
      origin: corsOrigins,
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    });
  }

  // Swagger must be registered before the routes so its onRoute hook sees them.
  await app.register(swagger, {
    openapi: {
      info: { title: 'URL Shortener API', version: '1.0.0' },
      tags: [
        { name: 'auth', description: 'Register, log in and log out' },
        { name: 'links', description: 'Create and manage short links' },
        { name: 'redirect', description: 'Follow a short link' },
      ],
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(routes, { db, baseUrl: baseUrl.replace(/\/+$/, '') });

  return app;
}
