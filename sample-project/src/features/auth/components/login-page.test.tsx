import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { authMocks, createAuthHandlers, sessionFixture } from '../mocks';

const fillAndSubmit = async (user: UserEvent, email: string, password: string) => {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginPage', () => {
  it('validates on the client without calling the API', async () => {
    const calls = vi.fn();
    server.use(
      http.post(`${config.apiUrl}/auth/login`, () => {
        calls();
        return HttpResponse.json({});
      }),
    );
    const { user } = renderRoute('/login');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).not.toHaveBeenCalled();
  });

  it('rejects an email that is not an address', async () => {
    const { user } = renderRoute('/login');
    await fillAndSubmit(user, 'not-an-email', 'password123');
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('signs in, lands on the app and shows the user in the header', async () => {
    server.use(...createAuthHandlers());
    const { user } = renderRoute('/login');

    await fillAndSubmit(user, sessionFixture.email, 'password123');

    expect(await screen.findByRole('heading', { name: 'sample-project' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText(sessionFixture.email)).toBeInTheDocument();
  });

  it('says so when the email or password is wrong', async () => {
    server.use(...createAuthHandlers());
    const { user } = renderRoute('/login');

    await fillAndSubmit(user, sessionFixture.email, 'wrong-password');

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a server failure on the form', async () => {
    server.use(authMocks.fail('login', 500));
    const { user } = renderRoute('/login');

    await fillAndSubmit(user, sessionFixture.email, 'password123');

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });

  it('disables the button while signing in', async () => {
    server.use(authMocks.loginPending());
    const { user } = renderRoute('/login');

    await fillAndSubmit(user, sessionFixture.email, 'password123');

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });

  it('links to the register page', async () => {
    const { user } = renderRoute('/login');
    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });
});
