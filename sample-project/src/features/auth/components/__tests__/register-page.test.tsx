import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { authMocks, createAuthHandlers, sessionFixture } from '../../mocks';

const fillAndSubmit = async (user: UserEvent, email: string, password: string, confirm: string) => {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
};

describe('RegisterPage', () => {
  it('validates the password length on the client', async () => {
    const { user } = renderRoute('/register');
    await fillAndSubmit(user, 'bob@example.com', 'short', 'short');
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('shows a mismatch under the confirm field', async () => {
    const { user } = renderRoute('/register');

    await fillAndSubmit(user, 'bob@example.com', 'password123', 'password124');

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
  });

  it('creates the account, signs in, and does not send the confirmation', async () => {
    const bodies: unknown[] = [];
    server.use(...createAuthHandlers());
    // A later server.use() call wins: this records the body, then answers like the real one.
    server.use(
      http.post(`${config.apiUrl}/auth/register`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          { token: 't', expiresAt: sessionFixture.expiresAt },
          { status: 201 },
        );
      }),
    );
    const { user } = renderRoute('/register');

    await fillAndSubmit(user, 'bob@example.com', 'password123', 'password123');

    expect(await screen.findByRole('heading', { name: 'sample-project' })).toBeInTheDocument();
    expect(bodies).toEqual([{ email: 'bob@example.com', password: 'password123' }]);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows the API message when the email is taken', async () => {
    server.use(...createAuthHandlers());
    const { user } = renderRoute('/register');

    await fillAndSubmit(user, sessionFixture.email, 'password123', 'password123');

    expect(await screen.findByText('Email is already registered')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });

  it('shows a server failure on the form', async () => {
    server.use(authMocks.fail('register', 500));
    const { user } = renderRoute('/register');

    await fillAndSubmit(user, 'bob@example.com', 'password123', 'password123');

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });

  it('links back to the sign-in page', async () => {
    const { user } = renderRoute('/register');
    await user.click(await screen.findByRole('link', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
