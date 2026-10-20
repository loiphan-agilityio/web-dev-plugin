import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTodosHandlers } from '../../mocks';

// TodoList and TodoForm test their own states; this checks they work together on the route.
describe('TodosPage', () => {
  it('shows a new todo in the list after it is created', async () => {
    server.use(...createTodosHandlers([]));
    const { user } = renderRoute('/todos');
    await screen.findByText(/No todos yet/);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    const list = await screen.findByRole('list', { name: 'Todos' });
    expect(within(list).getByText('Ship it')).toBeInTheDocument();
  });
});
