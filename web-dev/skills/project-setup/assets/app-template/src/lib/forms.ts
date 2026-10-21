import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { type ApiError, toUserMessage } from '@/lib/api/errors';

/**
 * Shows an API failure on a React Hook Form form.
 *
 * A `ValidationError` with field messages puts each message under its input. Anything else
 * (or a validation error without field details) goes to `errors.root.server`, which the form
 * renders above the submit button.
 */
export const setFormErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: ApiError,
) => {
  if (error._tag === 'ValidationError' && Object.keys(error.fields).length > 0) {
    for (const [field, message] of Object.entries(error.fields)) {
      // Field names come from the server; they match the form when the API mirrors its schema.
      setError(field as Path<T>, { type: 'server', message });
    }
    return;
  }
  setError('root.server', { type: 'server', message: toUserMessage(error) });
};
