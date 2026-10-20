import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { LoanForm } from './loan-form';
import { LoanList } from './loan-list';

export const LoansPage = () => (
  <section className="space-y-6">
    <h1 className="font-heading text-2xl font-semibold">Loans</h1>
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Lend a book</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoanForm />
      </CardContent>
    </Card>
    <LoanList />
  </section>
);
