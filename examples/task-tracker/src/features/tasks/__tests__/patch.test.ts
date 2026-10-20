import { Schema } from 'effect';

import { changedFields, toEditInput } from '../patch';
import { TaskEdit } from '../schemas';
import { taskFixtures } from '../mocks';

const decodeEdit = Schema.decodeUnknownSync(TaskEdit);
const [task, , , , , withoutDate] = taskFixtures;

describe('toEditInput', () => {
  it('shows a missing due date as an empty string', () => {
    expect(withoutDate && toEditInput(withoutDate).dueDate).toBe('');
  });
});

describe('changedFields', () => {
  it('is empty when nothing changed', () => {
    if (!task) {
      throw new Error('missing fixture');
    }
    expect(changedFields(task, decodeEdit(toEditInput(task)))).toEqual({});
  });

  it('holds only the fields that changed, with the trimmed title and a null date', () => {
    if (!task) {
      throw new Error('missing fixture');
    }
    const values = decodeEdit({
      ...toEditInput(task),
      title: '  New title  ',
      status: 'done',
      dueDate: '',
    });
    expect(changedFields(task, values)).toEqual({
      title: 'New title',
      status: 'done',
      dueDate: null,
    });
  });
});
