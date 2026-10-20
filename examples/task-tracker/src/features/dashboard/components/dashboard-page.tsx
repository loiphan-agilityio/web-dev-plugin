import { DueSoonList } from './due-soon-list';
import { StatsCards } from './stats-cards';

export function DashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
      <StatsCards />
      <DueSoonList />
    </section>
  );
}
