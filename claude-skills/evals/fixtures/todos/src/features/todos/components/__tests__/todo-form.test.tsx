import { screen, waitFor } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todosMocks } from '../../mocks';
import { TodoForm } from '../todo-form';

describe('TodoForm', () => {
  it('validates on the client', async () => {
    const { user } = renderWithProviders(<TodoForm />);

    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the input after a successful submit', async () => {
    server.use(...createTodosHandlers([]));
    const { user } = renderWithProviders(<TodoForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
  });

  it('shows server field errors under the input', async () => {
    server.use(todosMocks.createInvalid({ title: 'Already exists' }));
    const { user } = renderWithProviders(<TodoForm />);

    await user.type(screen.getByLabelText('Title'), 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByText('Already exists')).toBeInTheDocument();
  });
});
