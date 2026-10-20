import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import { daysFromToday, isOverdue, todayIso } from './dates';
import type { NewTask, Task, TaskPatch, TaskStats } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

const notFound = () => HttpResponse.json({ message: 'Not found' }, { status: 404 });

const createdAt = (daysAgo: number) => `${daysFromToday(-daysAgo)}T09:00:00.000Z`;

/** A task for component stories and tests that need one (it is fixture 3, due tomorrow). */
export const sampleTask: Task = {
  id: 3,
  title: 'Review pull request 142',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: daysFromToday(1),
  createdAt: createdAt(3),
};

/** Realistic tasks relative to today: every status and priority, four of them overdue. */
export const taskFixtures: Task[] = [
  {
    id: 1,
    title: 'Write the Q3 report',
    description: 'Summarise delivery metrics and open risks for the leadership review.',
    status: 'in_progress',
    priority: 'high',
    dueDate: daysFromToday(-2),
    createdAt: createdAt(10),
  },
  {
    id: 2,
    title: 'Fix login redirect bug',
    description: 'Users land on a blank page after signing in from a deep link.',
    status: 'todo',
    priority: 'high',
    dueDate: daysFromToday(-5),
    createdAt: createdAt(8),
  },
  {
    id: 3,
    title: 'Review pull request 142',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: daysFromToday(1),
    createdAt: createdAt(3),
  },
  {
    id: 4,
    title: 'Update onboarding docs',
    description: 'Add the new SSO steps and refresh the screenshots.',
    status: 'in_progress',
    priority: 'medium',
    dueDate: daysFromToday(7),
    createdAt: createdAt(6),
  },
  {
    id: 5,
    title: 'Book team offsite venue',
    description: 'Shortlist three venues for 12 people.',
    status: 'todo',
    priority: 'low',
    dueDate: null,
    createdAt: createdAt(12),
  },
  {
    id: 6,
    title: 'Renew SSL certificate',
    description: 'Expires at the end of the month.',
    status: 'done',
    priority: 'high',
    dueDate: daysFromToday(-1),
    createdAt: createdAt(20),
  },
  {
    id: 7,
    title: 'Clean up old feature flags',
    description: 'Remove the flags that shipped to 100% in spring.',
    status: 'todo',
    priority: 'low',
    dueDate: daysFromToday(-9),
    createdAt: createdAt(30),
  },
  {
    id: 8,
    title: 'Plan sprint retrospective',
    description: 'Prepare the board and send the invite.',
    status: 'done',
    priority: 'medium',
    dueDate: daysFromToday(-3),
    createdAt: createdAt(5),
  },
];

/** What the backend computes for `GET /tasks/stats`; `dueThisWeek` is unfinished, today..+7 days. */
export const computeStats = (tasks: readonly Task[]): TaskStats => {
  const today = todayIso();
  const weekEnd = daysFromToday(7);
  const count = (predicate: (task: Task) => boolean) => tasks.filter(predicate).length;
  return {
    total: tasks.length,
    todo: count((t) => t.status === 'todo'),
    inProgress: count((t) => t.status === 'in_progress'),
    done: count((t) => t.status === 'done'),
    overdue: count((t) => isOverdue(t, today)),
    dueThisWeek: count(
      (t) =>
        t.status !== 'done' && t.dueDate !== null && t.dueDate >= today && t.dueDate <= weekEnd,
    ),
  };
};

/**
 * A small in-memory backend. Each call gets its own copy of the data, so tests that call
 * `server.use(...createTasksHandlers())` never see state left over from another test.
 */
export const createTasksHandlers = (initial: Task[] = taskFixtures) => {
  const tasks = [...initial];
  return [
    http.get(url('/tasks'), () => HttpResponse.json(tasks)),
    // Before '/tasks/:id', or "stats" would be taken for an id (the first match wins).
    http.get(url('/tasks/stats'), () => HttpResponse.json(computeStats(tasks))),
    http.post(url('/tasks'), async ({ request }) => {
      const body = (await request.json()) as Omit<NewTask, 'dueDate'> & {
        dueDate: string | null;
      };
      const task: Task = {
        ...body,
        id: Math.max(0, ...tasks.map((t) => t.id)) + 1,
        status: 'todo',
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      return HttpResponse.json(task, { status: 201 });
    }),
    http.get(url('/tasks/:id'), ({ params }) => {
      const task = tasks.find((t) => t.id === Number(params.id));
      return task ? HttpResponse.json(task) : notFound();
    }),
    http.patch(url('/tasks/:id'), async ({ params, request }) => {
      const index = tasks.findIndex((t) => t.id === Number(params.id));
      const current = tasks[index];
      if (!current) return notFound();
      const updated: Task = { ...current, ...((await request.json()) as TaskPatch) };
      tasks[index] = updated;
      return HttpResponse.json(updated);
    }),
    http.delete(url('/tasks/:id'), ({ params }) => {
      const index = tasks.findIndex((t) => t.id === Number(params.id));
      if (index === -1) return notFound();
      tasks.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
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
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/tasks'), () =>
      HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 }),
    ),
  detailPending: () =>
    http.get(url('/tasks/:id'), async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  detailError: (status = 500) =>
    http.get(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  detailNotFound: () => http.get(url('/tasks/:id'), () => notFound()),
  updateInvalid: (errors: Record<string, string>) =>
    http.patch(url('/tasks/:id'), () =>
      HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 }),
    ),
  updateError: (status = 500) =>
    http.patch(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  updateNotFound: () => http.patch(url('/tasks/:id'), () => notFound()),
  deleteError: (status = 500) =>
    http.delete(url('/tasks/:id'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  deleteNotFound: () => http.delete(url('/tasks/:id'), () => notFound()),
};
