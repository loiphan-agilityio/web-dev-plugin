#!/usr/bin/env bash
# Writes a `other-stack` fixture into the current directory: React on another stack (axios, zod,
# react-router-dom 6, TanStack Query, no Effect). Nothing is installed.
set -euo pipefail
mkdir -p src/lib src/features/employees/__tests__
cat > package.json <<'JSON'
{
  "name": "employee-portal",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc && vite build", "lint": "eslint src", "test": "vitest run" },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "zod": "^3.23.8"
  },
  "devDependencies": { "typescript": "^5.6.3", "vite": "^5.4.10", "vitest": "^2.1.4" }
}
JSON
cat > src/lib/http.ts <<'TS'
import axios from 'axios';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });
TS
cat > src/features/employees/api.ts <<'TS'
import { z } from 'zod';
import { http } from '../../lib/http';

export const Employee = z.object({ id: z.number(), name: z.string(), department: z.string() });
export type Employee = z.infer<typeof Employee>;

export const listEmployees = async () => z.array(Employee).parse((await http.get('/employees')).data);
TS
cat > src/features/employees/employee-list.tsx <<'TSX'
import { useQuery } from '@tanstack/react-query';
import { listEmployees } from './api';

export const EmployeeList = () => {
  const employees = useQuery({ queryKey: ['employees'], queryFn: listEmployees });
  if (employees.isPending) return <p>Loading…</p>;
  if (employees.isError) return <p role="alert">{employees.error.message}</p>;
  return <ul>{employees.data.map((e) => <li key={e.id}>{e.name} · {e.department}</li>)}</ul>;
};
TSX
cat > src/features/employees/__tests__/employee-list.test.tsx <<'TSX'
import { describe, it } from 'vitest';

describe('EmployeeList', () => {
  it.todo('lists employees');
});
TSX
