import { DueSoonList } from './due-soon-list';
import { StatsCards } from './stats-cards';

export const DashboardPage = () => (
  <section className="space-y-6">
    <h1 className="font-heading text-3xl font-bold tracking-tight">Dashboard</h1>
    <StatsCards />
    <DueSoonList />
  </section>
);
