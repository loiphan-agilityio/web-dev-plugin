import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api/errors';
import { setFormErrors } from '@/lib/forms';

import { useCreateBook, useUpdateBook } from '../queries';
import { type Book, NewBook, type NewBookInput } from '../schemas';

// Built once at module level. The fields hold NewBook.Encoded (text), handleSubmit passes
// NewBook.Type (trimmed, copies as a number).
const resolver = effectTsResolver(NewBook);

const fields = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'author', label: 'Author', type: 'text' },
  { name: 'isbn', label: 'ISBN', type: 'text' },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'totalCopies', label: 'Total copies', type: 'number' },
] as const;

const emptyValues: NewBookInput = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  totalCopies: '1',
};

const valuesOf = ({ title, author, isbn, category, totalCopies }: Book): NewBookInput => ({
  title,
  author,
  isbn,
  category,
  totalCopies: String(totalCopies),
});

interface BookFormProps {
  /** The book to edit; without it the form adds a new one. */
  book?: Book;
  /** Called after a successful edit, so the page can close the form. */
  onDone?: () => void;
}

export const BookForm = ({ book, onDone }: BookFormProps) => {
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  // Type arguments, so the field types come from the schema.
  const form = useForm<NewBookInput, unknown, NewBook>({
    resolver,
    defaultValues: book ? valuesOf(book) : emptyValues,
  });

  const onError = (error: ApiError) => {
    setFormErrors(form.setError, error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (book) {
      updateBook.mutate(
        { id: book.id, input: values },
        {
          onSuccess: () => {
            toast.success('Book updated');
            onDone?.();
          },
          onError,
        },
      );
      return;
    }
    createBook.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success('Book created');
      },
      onError,
    });
  });

  const isPending = createBook.isPending || updateBook.isPending;
  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ name, label, type }) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`book-${name}`}>{label}</FieldLabel>
                  <Input
                    {...field}
                    id={`book-${name}`}
                    type={type}
                    {...(type === 'number' && { min: 1, max: 99 })}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
        </div>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {book ? (isPending ? 'Saving…' : 'Save book') : isPending ? 'Adding…' : 'Add book'}
          </Button>
          {book && (
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
};
