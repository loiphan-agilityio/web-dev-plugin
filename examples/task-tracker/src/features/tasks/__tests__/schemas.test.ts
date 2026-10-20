import { Schema } from 'effect';

import { NewTask, Task, TaskEdit, TaskStats } from '../schemas';

describe('TaskStats', () => {
  const stats = { total: 8, todo: 4, inProgress: 2, done: 2, overdue: 3, dueThisWeek: 1 };

  it('decodes the stats counts', () => {
    expect(Schema.decodeUnknownSync(TaskStats)(stats)).toEqual(stats);
  });

  it('rejects a response with a missing or non-numeric count', () => {
    expect(() => Schema.decodeUnknownSync(TaskStats)({ ...stats, overdue: undefined })).toThrow();
    expect(() => Schema.decodeUnknownSync(TaskStats)({ ...stats, done: '2' })).toThrow();
  });
});

describe('TaskEdit', () => {
  const decodeEdit = Schema.decodeUnknownSync(TaskEdit);
  const valid = {
    title: ' Ship it ',
    description: '',
    priority: 'low',
    status: 'done',
    dueDate: '',
  };

  it('has the same rules as NewTask, plus a status', () => {
    expect(decodeEdit(valid)).toEqual({ ...valid, title: 'Ship it', dueDate: null });
    expect(() => decodeEdit({ ...valid, title: ' ' })).toThrow('Title is required');
    expect(() => decodeEdit({ ...valid, status: 'archived' })).toThrow();
  });
});

const decodeNewTask = Schema.decodeUnknownSync(NewTask);
const valid = { title: 'Ship it', description: '', priority: 'medium', dueDate: '' };

describe('NewTask', () => {
  it('trims the title', () => {
    expect(decodeNewTask({ ...valid, title: '  buy milk  ' }).title).toBe('buy milk');
  });

  it('sends an empty due date as null and keeps a chosen one', () => {
    expect(decodeNewTask(valid).dueDate).toBeNull();
    expect(decodeNewTask({ ...valid, dueDate: '2026-12-01' }).dueDate).toBe('2026-12-01');
  });

  it('rejects a blank title', () => {
    expect(() => decodeNewTask({ ...valid, title: '   ' })).toThrow('Title is required');
  });

  it('accepts a title of 120 characters and rejects 121', () => {
    expect(() => decodeNewTask({ ...valid, title: 'a'.repeat(120) })).not.toThrow();
    expect(() => decodeNewTask({ ...valid, title: 'a'.repeat(121) })).toThrow(
      'Keep the title under 120 characters',
    );
  });

  it('accepts a description of 1000 characters and rejects 1001', () => {
    expect(() => decodeNewTask({ ...valid, description: 'a'.repeat(1000) })).not.toThrow();
    expect(() => decodeNewTask({ ...valid, description: 'a'.repeat(1001) })).toThrow(
      'Keep the description under 1000 characters',
    );
  });

  it('rejects an unknown priority', () => {
    expect(() => decodeNewTask({ ...valid, priority: 'urgent' })).toThrow();
  });
});

describe('Task', () => {
  it('decodes an API task with a null due date', () => {
    const task = {
      id: 1,
      title: 'A',
      description: '',
      status: 'in_progress',
      priority: 'low',
      dueDate: null,
      createdAt: '2026-01-05T09:00:00.000Z',
    };
    expect(Schema.decodeUnknownSync(Task)(task)).toEqual(task);
  });

  it('rejects an unknown status', () => {
    expect(() =>
      Schema.decodeUnknownSync(Task)({
        id: 1,
        title: 'A',
        description: '',
        status: 'blocked',
        priority: 'low',
        dueDate: null,
        createdAt: '2026-01-05T09:00:00.000Z',
      }),
    ).toThrow();
  });
});
