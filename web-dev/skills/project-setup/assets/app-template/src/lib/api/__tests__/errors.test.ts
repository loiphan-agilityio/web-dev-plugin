import {
  ForbiddenError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
  toUserMessage,
  UnauthorizedError,
  ValidationError,
} from '../errors';

describe('toUserMessage', () => {
  it.each([
    [new NetworkError(), 'Could not reach the server. Check your connection and try again.'],
    [new UnauthorizedError(), 'Your session has expired. Please sign in again.'],
    [new ForbiddenError(), 'You do not have permission to do this.'],
    [new NotFoundError(), 'We could not find what you were looking for.'],
    [new ValidationError({ message: 'Title is required', fields: {} }), 'Title is required'],
    [new ServerError({ status: 503 }), 'Something went wrong on our side. Please try again.'],
    [
      new InvalidResponseError({ message: 'x' }),
      'The server sent an unexpected response. Please try again later.',
    ],
  ])('%s', (error, message) => {
    expect(toUserMessage(error)).toBe(message);
  });
});
