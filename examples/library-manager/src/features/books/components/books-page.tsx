import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Book } from '../schemas';
import { BookForm } from './book-form';
import { BookList } from './book-list';

export const BooksPage = () => {
  const [editing, setEditing] = useState<Book | null>(null);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Books</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{editing ? 'Edit book' : 'Add a book'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookForm
            key={editing?.id ?? 'new'}
            book={editing ?? undefined}
            onDone={() => {
              setEditing(null);
            }}
          />
        </CardContent>
      </Card>
      <BookList onEdit={setEditing} />
    </section>
  );
};
