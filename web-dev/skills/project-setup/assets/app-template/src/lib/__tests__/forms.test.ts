import { NetworkError, ValidationError } from '@/lib/api/errors';

import { setFormErrors } from '../forms';

describe('setFormErrors', () => {
  it('puts each server field message under its input', () => {
    const setError = vi.fn();
    setFormErrors(
      setError,
      new ValidationError({ message: 'Invalid', fields: { title: 'Too long' } }),
    );
    expect(setError).toHaveBeenCalledWith('title', { type: 'server', message: 'Too long' });
  });

  it('puts any other failure on the root of the form', () => {
    const setError = vi.fn();
    setFormErrors(setError, new NetworkError());
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });
});
