import { Schema } from 'effect';

import { NewMember } from '../schemas';

const decode = Schema.decodeUnknownSync(NewMember);

const valid = {
  name: 'Amelia Hart',
  email: 'amelia.hart@example.com',
  phone: '555-0101',
  status: 'active',
};

describe('NewMember', () => {
  it('trims the text fields', () => {
    expect(
      decode({ ...valid, name: '  Amelia Hart ', email: ' amelia.hart@example.com ', phone: ' ' }),
    ).toEqual({ ...valid, phone: '' });
  });

  it.each([
    [{ name: '   ' }, 'Name is required'],
    [{ name: 'x'.repeat(121) }, 'Keep the name under 120 characters'],
    [{ email: '' }, 'Email is required'],
    [{ email: 'not-an-email' }, 'Enter a valid email address'],
    [{ email: 'a@b' }, 'Enter a valid email address'],
    [{ phone: 'x'.repeat(31) }, 'Keep the phone under 30 characters'],
  ])('rejects %j', (change, message) => {
    expect(() => decode({ ...valid, ...change })).toThrow(message);
  });

  it('only allows the active and suspended statuses', () => {
    expect(decode({ ...valid, status: 'suspended' }).status).toBe('suspended');
    expect(() => decode({ ...valid, status: 'banned' })).toThrow();
  });
});
