import { Schema } from 'effect';

import { NewTodo } from './schemas';

const decode = Schema.decodeUnknownSync(NewTodo);

describe('NewTodo', () => {
  it('trims the title', () => {
    expect(decode({ title: '  buy milk  ' })).toEqual({ title: 'buy milk' });
  });

  it('rejects a blank title', () => {
    expect(() => decode({ title: '   ' })).toThrow('Title is required');
  });
});
