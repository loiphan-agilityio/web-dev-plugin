import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todoFixtures, todosMocks } from '../mocks';
import { TodoList } from './todo-list';

describe('TodoList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(todosMocks.listPending());
    renderWithProviders(<TodoList />);
    expect(await screen.findByRole('status', { name: 'Loading todos' })).toBeInTheDocument();
  });

  it('shows the todos', async () => {
    server.use(...createTodosHandlers(todoFixtures));
    renderWithProviders(<TodoList />);
    const list = await screen.findByRole('list', { name: 'Todos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(todoFixtures.length);
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createTodosHandlers([]));
    renderWithProviders(<TodoList />);
    expect(await screen.findByText(/No todos yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(todosMocks.listError(500));
    const { user } = renderWithProviders(<TodoList />);
    expect(await screen.findByText('Could not load todos')).toBeInTheDocument();

    server.use(...createTodosHandlers(todoFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Todos' })).toBeInTheDocument();
  });
});
