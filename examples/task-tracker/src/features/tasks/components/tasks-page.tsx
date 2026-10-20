import { TaskFilters } from './task-filters';
import { TaskForm } from './task-form';
import { TaskList } from './task-list';

export const TasksPage = () => (
  <section className="space-y-6">
    <h1 className="font-heading text-2xl font-bold tracking-tight">Tasks</h1>
    <TaskForm />
    <TaskFilters />
    <TaskList />
  </section>
);
