import { OverdueTable } from './overdue-table';
import { StatCards } from './stat-cards';

export const OverviewPage = () => (
  <section className="space-y-6">
    <h1 className="font-heading text-2xl font-semibold">Overview</h1>
    <StatCards />
    <section aria-labelledby="overdue-heading" className="space-y-3">
      <h2 id="overdue-heading" className="font-heading text-lg font-medium">
        Overdue loans
      </h2>
      <OverdueTable />
    </section>
  </section>
);
