import { TodoForm } from './todo-form';
import { TodoList } from './todo-list';

export function TodosPage() {
  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Todos</h1>
      <TodoForm />
      <TodoList />
    </section>
  );
}
