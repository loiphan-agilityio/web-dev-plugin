import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toUserMessage } from '@/lib/api/errors';

import { bookListQueryOptions } from '../queries';
import type { Book } from '../schemas';
import { BookDeleteButton } from './book-delete-button';

const matches = ({ title, author, isbn }: Book, query: string) =>
  [title, author, isbn].some((text) => text.toLowerCase().includes(query));

/** Loading, error, empty, no-match and success are five different screens. Filters live in the URL. */
export const BookList = ({ onEdit }: { onEdit: (book: Book) => void }) => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(bookListQueryOptions());
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const availableOnly = searchParams.get('availability') === 'available';

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  if (isPending) {
    return (
      <div role="status" aria-label="Loading books" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load books</AlertTitle>
        <AlertDescription>
          <p>{toUserMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground">No books yet. Add the first one above.</p>;
  }

  const needle = query.trim().toLowerCase();
  const books = data.filter(
    (book) => matches(book, needle) && (!availableOnly || book.availableCopies > 0),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          aria-label="Search books"
          placeholder="Search title, author or ISBN"
          className="max-w-xs"
          value={query}
          onChange={(event) => {
            setParam('q', event.target.value);
          }}
        />
        <NativeSelect
          aria-label="Availability"
          value={availableOnly ? 'available' : ''}
          onChange={(event) => {
            setParam('availability', event.target.value);
          }}
        >
          <NativeSelectOption value="">All books</NativeSelectOption>
          <NativeSelectOption value="available">Available now</NativeSelectOption>
        </NativeSelect>
      </div>
      {books.length === 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">No books match your filters.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchParams({}, { replace: true });
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <Table aria-label="Books">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Copies</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>{book.isbn}</TableCell>
                <TableCell>{book.category || 'Uncategorised'}</TableCell>
                <TableCell>
                  <span className="mr-2">{`${book.availableCopies} / ${book.totalCopies}`}</span>
                  {book.availableCopies === 0 && <Badge variant="destructive">Unavailable</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${book.title}`}
                      onClick={() => {
                        onEdit(book);
                      }}
                    >
                      Edit
                    </Button>
                    <BookDeleteButton book={book} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
