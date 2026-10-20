import { screen, within } from '@testing-library/react';

import { createTasksHandlers, taskFixtures } from '@/features/tasks/mocks';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

describe('DashboardPage', () => {
  it('is the home page, with the stats and the due soon list together', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('progressbar', { name: 'Completion rate' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Due soon' })).toBeInTheDocument();
  });

  it('is linked from the header as "Dashboard"', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks');
    await screen.findByRole('heading', { name: 'Tasks' });

    await user.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Dashboard' }),
    );

    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('opens a due soon task on its detail page', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('link', { name: 'Write release notes for v2.4' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('Write release notes for v2.4');
  });
});
