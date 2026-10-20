import { TaskFilters } from './task-filters';
import { TaskForm } from './task-form';
import { TaskList } from './task-list';

export function TasksPage() {
  return (
    <section className="space-y-6">
      <h1 className="font-heading text-3xl font-bold">Tasks</h1>
      <TaskForm />
      <TaskFilters />
      <TaskList />
    </section>
  );
}
