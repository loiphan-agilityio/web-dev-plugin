import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, tasksMocks } from '../../mocks';
import { TaskForm } from '../task-form';

describe('TaskForm', () => {
  it('defaults the priority to medium', () => {
    renderWithProviders(<TaskForm />);
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
  });

  it('requires a title', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('treats a title of only spaces as empty', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), '   ');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
  });

  it('rejects a title longer than 120 characters', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(121));
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Keep the title under 120 characters')).toBeInTheDocument();
  });

  it('rejects a description longer than 1000 characters', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.click(screen.getByLabelText('Description'));
    await user.paste('a'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(
      await screen.findByText('Keep the description under 1000 characters'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends the trimmed title, priority and due date', async () => {
    let body: unknown;
    server.use(
      http.post(`${config.apiUrl}/tasks`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 1,
            title: 'Ship it',
            description: 'Soon',
            status: 'todo',
            priority: 'high',
            dueDate: '2030-01-31',
            createdAt: '2026-01-05T09:00:00.000Z',
          },
          { status: 201 },
        );
      }),
      ...createTasksHandlers([]),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.type(screen.getByLabelText('Description'), 'Soon');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High');
    await user.type(screen.getByLabelText('Due date'), '2030-01-31');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Task created')).toBeInTheDocument();
    expect(body).toEqual({
      title: 'Ship it',
      description: 'Soon',
      priority: 'high',
      dueDate: '2030-01-31',
    });
  });

  it('sends a null due date when none is chosen', async () => {
    let body: unknown;
    server.use(
      http.post(`${config.apiUrl}/tasks`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 1,
            title: 'Ship it',
            description: '',
            status: 'todo',
            priority: 'medium',
            dueDate: null,
            createdAt: '2026-01-05T09:00:00.000Z',
          },
          { status: 201 },
        );
      }),
      ...createTasksHandlers([]),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    await screen.findByText('Task created');
    expect(body).toEqual({ title: 'Ship it', description: '', priority: 'medium', dueDate: null });
  });

  it('clears the form and shows a toast after a successful submit', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.selectOptions(screen.getByLabelText('Priority'), 'Low');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Task created')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
  });

  it('shows server field errors next to the fields', async () => {
    server.use(
      tasksMocks.createInvalid({
        title: 'A task with this title already exists',
        dueDate: 'Due date is not valid',
      }),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('A task with this title already exists')).toBeInTheDocument();
    expect(screen.getByText('Due date is not valid')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Due date')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Title')).toHaveValue('Duplicate');
  });

  it('shows a server failure without field details above the button', async () => {
    server.use(http.post(`${config.apiUrl}/tasks`, () => HttpResponse.json({}, { status: 500 })));
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Ship it');
  });
});
