import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import type { NewTask, Task, TaskPatch, TaskStats } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

/** `YYYY-MM-DD` for today plus `days` (negative = past), in local time like the app. */
export const dateFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
};

const createdAt = '2026-01-05T09:00:00.000Z';

/** Eight tasks covering every status and priority; three are overdue (past due, not done; #5 is past due but done). */
export const taskFixtures: Task[] = [
  {
    id: 1,
    title: 'Send the Q3 report to finance',
    description: 'Include the revenue breakdown by region.',
    status: 'todo',
    priority: 'high',
    dueDate: dateFromToday(-3),
    createdAt,
  },
  {
    id: 2,
    title: 'Review pull request for the billing page',
    description: 'Check the rounding of invoice totals.',
    status: 'in_progress',
    priority: 'medium',
    dueDate: dateFromToday(-1),
    createdAt,
  },
  {
    id: 3,
    title: 'Book the team offsite venue',
    description: '',
    status: 'todo',
    priority: 'low',
    dueDate: dateFromToday(21),
    createdAt,
  },
  {
    id: 4,
    title: 'Write release notes for v2.4',
    description: 'Highlight the new export feature.',
    status: 'in_progress',
    priority: 'high',
    dueDate: dateFromToday(2),
    createdAt,
  },
  {
    id: 5,
    title: 'Renew the SSL certificate',
    description: 'Expires at the end of the month.',
    status: 'done',
    priority: 'high',
    dueDate: dateFromToday(-10),
    createdAt,
  },
  {
    id: 6,
    title: 'Update onboarding checklist',
    description: 'Add the security training step.',
    status: 'done',
    priority: 'low',
    dueDate: null,
    createdAt,
  },
  {
    id: 7,
    title: 'Plan the customer interview round',
    description: 'Five interviews, two weeks.',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    createdAt,
  },
  {
    id: 8,
    title: 'Fix the flaky checkout test',
    description: 'Fails about one run in ten on CI.',
    status: 'todo',
    priority: 'medium',
    dueDate: dateFromToday(-7),
    createdAt,
  },
];

/** What the real `GET /tasks/stats` computes: overdue = past due, not done; this week = today..+7, not done. */
const statsOf = (tasks: readonly Task[]): TaskStats => {
  const today = dateFromToday(0);
  const weekEnd = dateFromToday(7);
  const open = tasks.filter(({ status }) => status !== 'done');
  return {
    total: tasks.length,
    todo: tasks.filter(({ status }) => status === 'todo').length,
    inProgress: tasks.filter(({ status }) => status === 'in_progress').length,
    done: tasks.length - open.length,
    overdue: open.filter(({ dueDate }) => dueDate !== null && dueDate < today).length,
    dueThisWeek: open.filter(
      ({ dueDate }) => dueDate !== null && dueDate >= today && dueDate <= weekEnd,
    ).length,
  };
};

/**
 * A small in-memory backend. Each call gets its own copy of the data, so tests that call
 * `server.use(...createTasksHandlers())` never see state left over from another test.
 */
export const createTasksHandlers = (initial: Task[] = taskFixtures) => {
  let tasks = [...initial];
  const notFound = () => HttpResponse.json({ message: 'Not found' }, { status: 404 });
  return [
    http.get(url('/tasks'), () => HttpResponse.json(tasks)),
    // A fixed path goes before `/tasks/:id`: the first match wins and `:id` would match `stats`.
    http.get(url('/tasks/stats'), () => HttpResponse.json(statsOf(tasks))),
    http.get<{ id: string }>(url('/tasks/:id'), ({ params }) => {
      const task = tasks.find(({ id }) => id === Number(params.id));
      return task ? HttpResponse.json(task) : notFound();
    }),
    http.patch<{ id: string }, TaskPatch>(url('/tasks/:id'), async ({ params, request }) => {
      const index = tasks.findIndex(({ id }) => id === Number(params.id));
      const current = tasks[index];
      if (!current) {
        return notFound();
      }
      const updated: Task = { ...current, ...(await request.json()) };
      tasks = tasks.map((task, position) => (position === index ? updated : task));
      return HttpResponse.json(updated);
    }),
    http.delete<{ id: string }>(url('/tasks/:id'), ({ params }) => {
      if (!tasks.some(({ id }) => id === Number(params.id))) {
        return notFound();
      }
      tasks = tasks.filter(({ id }) => id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.post<never, NewTask>(url('/tasks'), async ({ request }) => {
      const { title, description, priority, dueDate } = await request.json();
      const task: Task = {
        id: Math.max(0, ...tasks.map(({ id }) => id)) + 1,
        title,
        description,
        status: 'todo',
        priority,
        dueDate,
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      return HttpResponse.json(task, { status: 201 });
    }),
  ];
};

/** Default handlers, registered in src/mocks/handlers.ts. */
export const tasksHandlers = createTasksHandlers();

/** One-off responses for the states a test needs to drive. */
export const tasksMocks = {
  listPending: () =>
    http.get(url('/tasks'), async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  listError: (status = 500) =>
    http.get(url('/tasks'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  statsPending: () =>
    http.get(url('/tasks/stats'), async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  statsError: (status = 500) =>
    http.get(url('/tasks/stats'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  detailPending: () =>
    http.get(url('/tasks/:id'), async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  detailError: (status = 500) =>
    http.get(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  updateError: (status = 500) =>
    http.patch(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  updateInvalid: (errors: Record<string, string>) =>
    http.patch(url('/tasks/:id'), () =>
      HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 }),
    ),
  deleteError: (status = 500) =>
    http.delete(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/tasks'), () =>
      HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 }),
    ),
};
