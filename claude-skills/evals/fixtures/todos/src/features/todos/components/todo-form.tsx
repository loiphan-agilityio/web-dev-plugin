import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Schema } from 'effect';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { setFormErrors } from '@/lib/forms';

import { useCreateTodo } from '../queries';
import { NewTodo, type NewTodoInput } from '../schemas';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<NewTodoInput, unknown, NewTodo>(
  Schema.toStandardSchemaV1(NewTodo),
);

export function TodoForm() {
  const createTodo = useCreateTodo();
  const form = useForm<NewTodoInput, unknown, NewTodo>({
    resolver,
    defaultValues: { title: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    createTodo.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success('Todo added');
      },
      onError: (error) => {
        setFormErrors(form.setError, error);
      },
    });
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="todo-title">Title</FieldLabel>
              <Input
                {...field}
                id="todo-title"
                placeholder="What needs doing?"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={createTodo.isPending}>
          {createTodo.isPending ? 'Adding…' : 'Add todo'}
        </Button>
      </FieldGroup>
    </form>
  );
}
