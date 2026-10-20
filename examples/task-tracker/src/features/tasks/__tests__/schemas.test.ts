import { Schema } from 'effect';

import { EditTask, NewTask, Task, TaskStats, toEditInput, toTaskPatch } from '../schemas';

const decodeTaskStats = Schema.decodeUnknownSync(TaskStats);
const decodeNewTask = Schema.decodeUnknownSync(NewTask);
const decodeTask = Schema.decodeUnknownSync(Task);

const valid = { title: 'Write report', description: '', priority: 'medium', dueDate: '' };

describe('NewTask', () => {
  it('trims the title', () => {
    expect(decodeNewTask({ ...valid, title: '  Write report  ' }).title).toBe('Write report');
  });

  it('rejects a blank title', () => {
    expect(() => decodeNewTask({ ...valid, title: '   ' })).toThrow('Title is required');
  });

  it('accepts a title of exactly 120 characters, and rejects 121', () => {
    expect(decodeNewTask({ ...valid, title: 'a'.repeat(120) }).title).toHaveLength(120);
    expect(() => decodeNewTask({ ...valid, title: 'a'.repeat(121) })).toThrow(
      'Keep the title under 120 characters',
    );
  });

  it('accepts a description of exactly 1000 characters, and rejects 1001', () => {
    expect(decodeNewTask({ ...valid, description: 'a'.repeat(1000) }).description).toHaveLength(
      1000,
    );
    expect(() => decodeNewTask({ ...valid, description: 'a'.repeat(1001) })).toThrow(
      'Keep the description under 1000 characters',
    );
  });

  it('rejects an unknown priority', () => {
    expect(() => decodeNewTask({ ...valid, priority: 'urgent' })).toThrow();
  });
});

describe('EditTask', () => {
  const edit = { ...valid, status: 'todo' };

  it('validates like creating', () => {
    expect(() => Schema.decodeUnknownSync(EditTask)({ ...edit, title: ' ' })).toThrow(
      'Title is required',
    );
  });

  it('rejects an unknown status', () => {
    expect(() => Schema.decodeUnknownSync(EditTask)({ ...edit, status: 'blocked' })).toThrow();
  });
});

describe('toTaskPatch', () => {
  const task = {
    id: 1,
    title: 'Write report',
    description: 'Draft',
    status: 'todo',
    priority: 'high',
    dueDate: '2030-01-01',
    createdAt: '2026-01-01T09:00:00.000Z',
  } as const;
  const same = toEditInput(task);
  const decode = (input: object) => Schema.decodeUnknownSync(EditTask)({ ...same, ...input });

  it('is empty when nothing changed', () => {
    expect(toTaskPatch(task, decode({}))).toEqual({});
  });

  it('holds only the changed fields', () => {
    expect(toTaskPatch(task, decode({ status: 'done', priority: 'low' }))).toEqual({
      status: 'done',
      priority: 'low',
    });
  });

  it('turns an emptied due date into null, and leaves a missing one alone', () => {
    expect(toTaskPatch(task, decode({ dueDate: '' }))).toEqual({ dueDate: null });
    expect(toTaskPatch({ ...task, dueDate: null }, decode({ dueDate: '' }))).toEqual({});
  });
});

describe('Task', () => {
  const task = {
    id: 1,
    title: 'Write report',
    description: '',
    status: 'todo',
    priority: 'high',
    dueDate: null,
    createdAt: '2026-01-01T09:00:00.000Z',
  };

  it('accepts a task with and without a due date', () => {
    expect(decodeTask(task).dueDate).toBeNull();
    expect(decodeTask({ ...task, dueDate: '2026-02-01' }).dueDate).toBe('2026-02-01');
  });

  it('rejects an unknown status', () => {
    expect(() => decodeTask({ ...task, status: 'blocked' })).toThrow();
  });
});

describe('TaskStats', () => {
  const stats = { total: 8, todo: 4, inProgress: 2, done: 2, overdue: 3, dueThisWeek: 2 };

  it('accepts the stats payload', () => {
    expect(decodeTaskStats(stats)).toEqual(stats);
  });

  it('rejects a payload with a missing or non-numeric count', () => {
    expect(() => decodeTaskStats({ ...stats, done: '2' })).toThrow();
    expect(() => decodeTaskStats({ total: 1 })).toThrow();
  });
});
