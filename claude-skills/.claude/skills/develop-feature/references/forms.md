# Forms

Source: the todos feature (`components/todo-form.tsx`), `src/lib/forms.ts`, `src/components/ui/field.tsx` of the template.

## The full form

```tsx
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

export const TodoForm = () => {
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
};
```

## Rules, with the reason

- **Resolver at module level**, once. Rebuilding it per render wastes work and changes identity.
- **Explicit `<Input, unknown, Output>`** on both `standardSchemaResolver` and `useForm`. TypeScript cannot infer them through the intersection type `Schema.toStandardSchemaV1` returns; without them you get `any`-shaped errors or a failed typecheck. Do not use `effectTsResolver` (Effect 3 only) or `zodResolver`.
- **Input vs Output.** `Input` = `typeof Schema.Encoded` (what fields hold, e.g. untrimmed string); `Output` = `typeof Schema.Type` (what `handleSubmit` passes and what `mutate` takes).
- **`noValidate`** turns off the browser's own bubbles so the schema messages are the only ones.
- **`onSubmit={(event) => void onSubmit(event)}`**: `handleSubmit` returns a Promise and typescript-eslint `no-misused-promises` rejects passing it straight to a handler prop.
- **`Controller` + `Field`**: `data-invalid={fieldState.invalid}` on `Field` (colors label and error), `aria-invalid={fieldState.invalid}` on the control (what screen readers and tests read). `FieldLabel htmlFor` must match the control `id`, because tests use `getByLabelText`.
- **`FieldGroup` + `Field`** is the shadcn form layout. The old `Form` / `FormField` wrapper is gone; do not import it.
- **Mutate callbacks**: `onSuccess` resets the form and toasts; `onError` calls `setFormErrors(form.setError, error)`. Pass them to `mutate`, not `useMutation`, so they die with the component.
- **Pending**: `disabled={mutation.isPending}` on submit, and a label change ("Adding…") so the state is visible.

## Server errors

`setFormErrors` (template `src/lib/forms.ts`), in short:

A `ValidationError` with field messages puts each one under its input with `setError(field, { type: 'server', message })`; anything else goes to `errors.root.server` with `toUserMessage(error)`. Read the file in the project for the code.

- A `ValidationError` with `fields` puts each message under the field named by the server key. Those keys must equal your form field names; if the API names them differently, map before calling `setError`, or tell the user the contract mismatches.
- Everything else (network, 500, 403, a 422 with no fields) lands in `errors.root.server`; render it above the submit button as in the example (`Alert variant="destructive"`).

## Edit forms

Seed `defaultValues` from loaded data only after the query has succeeded (render the form inside the success branch), or pass `values`. Do not render the form during `isPending` with empty defaults and then expect it to update. For performance (many fields, `useWatch`, field arrays) read the `react-hook-form` companion, minus its zod and `integ-shadcn-*` advice.

## Other controls

Select, checkbox, textarea: add via `pnpm exec shadcn add <name>` and read the generated file in `src/components/ui/` for its props before wiring it into `Controller`. Pass `aria-invalid` the same way.

For a choice from a short list, prefer `native-select` (`pnpm exec shadcn add native-select`) over the Radix `select`. The Radix one opens a portal and relies on pointer capture and `scrollIntoView`, which jsdom does not implement, so its tests need stubs and are fragile; a native `<select>` is driven with `user.selectOptions(...)` and works on phones out of the box. Use the Radix `select` only when the design needs what a native one cannot show (icons or rich content in the options), and say so in the Result.
