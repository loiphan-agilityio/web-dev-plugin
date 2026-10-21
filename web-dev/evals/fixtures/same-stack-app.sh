#!/usr/bin/env bash
# Writes a `same-stack` fixture into the current directory: the web-dev stack (React, Vite, Effect,
# TanStack Query, React Hook Form) in a layout of its own: no src/lib/api/client.ts, no
# src/test/render.tsx. Enough files for routing and the project map; nothing is installed.
set -euo pipefail
mkdir -p src/api src/pages src/hooks src/pages/__tests__
cat > package.json <<'JSON'
{
  "name": "orders-admin",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "lint": "eslint .", "test": "vitest run" },
  "dependencies": {
    "@tanstack/react-query": "^5.104.5",
    "effect": "^4.0.5",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "react-hook-form": "^7.90.0",
    "react-router": "^8.5.0"
  },
  "devDependencies": { "typescript": "~6.0.3", "vite": "^8.3.4", "vitest": "^5.0.5" }
}
JSON
cat > src/api/http.ts <<'TS'
import { Effect } from 'effect';
import { HttpClient } from 'effect/http';

// Every request goes through here.
export const getJson = (path: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(`/api${path}`);
    return yield* response.json;
  });
TS
cat > src/api/orders.ts <<'TS'
import { getJson } from './http';

export const listOrders = () => getJson('/orders');
TS
cat > src/hooks/use-orders.ts <<'TS'
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { listOrders } from '../api/orders';

export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: () => Effect.runPromise(listOrders()) });
TS
cat > src/pages/orders-page.tsx <<'TSX'
import { useOrders } from '../hooks/use-orders';

export const OrdersPage = () => {
  const orders = useOrders();
  if (orders.isPending) return <p>Loading…</p>;
  if (orders.isError) return <p role="alert">Could not load orders.</p>;
  return <ul>{(orders.data as { id: number; status: string }[]).map((o) => <li key={o.id}>{o.status}</li>)}</ul>;
};
TSX
cat > src/pages/__tests__/orders-page.test.tsx <<'TSX'
import { describe, it } from 'vitest';

describe('OrdersPage', () => {
  it.todo('renders the orders');
});
TSX
