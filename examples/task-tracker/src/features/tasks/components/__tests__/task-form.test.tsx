import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, tasksMocks } from '../../mocks';
import { TaskForm } from '../task-form';

const submit = () => screen.getByRole('button', { name: 'Add task' });

describe('TaskForm', () => {
  it('defaults priority to medium', () => {
    renderWithProviders(<TaskForm />);
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
  });

  it('requires a title', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.click(submit());

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a title that is only spaces', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), '   ');
    await user.click(submit());

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
  });

  it('rejects a title over 120 characters', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(121));
    await user.click(submit());

    expect(await screen.findByText('Keep the title under 120 characters')).toBeInTheDocument();
  });

  it('rejects a description over 1000 characters', async () => {
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Valid');
    await user.click(screen.getByLabelText('Description (optional)'));
    await user.paste('a'.repeat(1001));
    await user.click(submit());

    expect(
      await screen.findByText('Keep the description under 1000 characters'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('sends the trimmed title, and null for a missing due date', async () => {
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
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          { status: 201 },
        );
      }),
      ...createTasksHandlers([]),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.click(submit());

    await waitFor(() => {
      expect(body).toEqual({ title: 'Ship it', description: '', priority: 'medium', dueDate: null });
    });
  });

  it('sends the chosen priority, description and due date', async () => {
    let body: unknown;
    server.use(
      http.post(`${config.apiUrl}/tasks`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            ...(body as object),
            id: 1,
            status: 'todo',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          { status: 201 },
        );
      }),
      ...createTasksHandlers([]),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Plan trip');
    await user.type(screen.getByLabelText('Description (optional)'), 'Book flights');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High');
    await user.type(screen.getByLabelText('Due date (optional)'), '2030-05-17');
    await user.click(submit());

    await waitFor(() => {
      expect(body).toEqual({
        title: 'Plan trip',
        description: 'Book flights',
        priority: 'high',
        dueDate: '2030-05-17',
      });
    });
  });

  it('clears the form and shows a toast after a successful submit', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.type(screen.getByLabelText('Description (optional)'), 'Soon');
    await user.selectOptions(screen.getByLabelText('Priority'), 'Low');
    await user.type(screen.getByLabelText('Due date (optional)'), '2030-05-17');
    await user.click(submit());

    expect(await screen.findByText('Task created')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
    expect(screen.getByLabelText('Due date (optional)')).toHaveValue('');
  });

  it('shows server field errors next to the fields and keeps the input', async () => {
    server.use(
      tasksMocks.createInvalid({
        title: 'A task with this title already exists',
        dueDate: 'Due date must not be in the past',
      }),
    );
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Duplicate');
    await user.click(submit());

    expect(await screen.findByText('A task with this title already exists')).toBeInTheDocument();
    expect(screen.getByText('Due date must not be in the past')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Duplicate');
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Task created')).not.toBeInTheDocument();
  });

  it('shows a general error when the server fails', async () => {
    server.use(http.post(`${config.apiUrl}/tasks`, () => HttpResponse.json({}, { status: 500 })));
    const { user } = renderWithProviders(<TaskForm />);

    await user.type(screen.getByLabelText('Title'), 'Anything');
    await user.click(submit());

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });
});
