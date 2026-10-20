import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { bookListQueryOptions } from '@/features/books/queries';
import { memberListQueryOptions } from '@/features/members/queries';
import { setFormErrors } from '@/lib/forms';

import { useCreateLoan } from '../queries';
import { NewLoan, type NewLoanInput } from '../schemas';

// Built once at module level. The selects hold ids as text; handleSubmit passes numbers.
const resolver = effectTsResolver(NewLoan);

const emptyValues: NewLoanInput = { bookId: '', memberId: '', dueDate: '' };

export const LoanForm = () => {
  const books = useQuery(bookListQueryOptions());
  const members = useQuery(memberListQueryOptions());
  const createLoan = useCreateLoan();
  const form = useForm<NewLoanInput, unknown, NewLoan>({
    resolver,
    defaultValues: emptyValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    createLoan.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success('Book lent');
      },
      onError: (error) => {
        setFormErrors(form.setError, error);
      },
    });
  });

  // Only books with a copy on the shelf and members in good standing can be chosen.
  const lendableBooks = (books.data ?? []).filter(({ availableCopies }) => availableCopies > 0);
  const activeMembers = (members.data ?? []).filter(({ status }) => status === 'active');
  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        {(books.isError || members.isError) && (
          <Alert variant="destructive">
            <AlertDescription>
              Could not load the books and members to choose from. Reload the page to try again.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Controller
            name="bookId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="loan-book">Book</FieldLabel>
                <NativeSelect {...field} id="loan-book" aria-invalid={fieldState.invalid}>
                  <NativeSelectOption value="">Choose a book</NativeSelectOption>
                  {lendableBooks.map(({ id, title, availableCopies }) => (
                    <NativeSelectOption key={id} value={String(id)}>
                      {`${title} (${availableCopies} available)`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="memberId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="loan-member">Member</FieldLabel>
                <NativeSelect {...field} id="loan-member" aria-invalid={fieldState.invalid}>
                  <NativeSelectOption value="">Choose a member</NativeSelectOption>
                  {activeMembers.map(({ id, name }) => (
                    <NativeSelectOption key={id} value={String(id)}>
                      {name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="dueDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="loan-due-date">Due date</FieldLabel>
                <Input
                  {...field}
                  id="loan-due-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>Optional. Defaults to 14 days from today.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={createLoan.isPending} className="w-fit">
          {createLoan.isPending ? 'Lending…' : 'Lend book'}
        </Button>
      </FieldGroup>
    </form>
  );
};
