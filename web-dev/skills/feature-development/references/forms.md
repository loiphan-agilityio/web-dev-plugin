# Forms

Source: the todos feature (`components/TodoForm/index.tsx`), `src/lib/forms.ts`, `packages/ui/src/components/field.tsx` of the boilerplate.

## The full form

```tsx file=src/features/todos/components/TodoForm/index.tsx
import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { setFormErrors } from '@/lib/forms';

import { useCreateTodo } from '../../queries';
import { NewTodo, type NewTodoInput } from '../../schemas';

// Built once at module level. The fields hold NewTodo.Encoded (untrimmed), handleSubmit
// passes NewTodo.Type (trimmed).
const resolver = effectTsResolver(NewTodo);

export const TodoForm = () => {
  const createTodo = useCreateTodo();

  // Type arguments, so the field types come from the schema: inferred from defaultValues, a
  // literal union such as 'low' | 'medium' | 'high' would widen to string and break the resolver.
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
        setFormErrors(form.setError, error, form.getValues());
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
- **`effectTsResolver(Schema)`** from `@hookform/resolvers/effect-ts` (version 6, built for Effect 4). It takes the Effect Schema itself, decodes with `Schema.decodeUnknownEffect`, and shows each `Schema.check` message under its field. No `Schema.toStandardSchemaV1` wrapper. Not `zodResolver`, and not `standardSchemaResolver`.
- **`useForm<Input, unknown, Output>`** with `Input = typeof Schema.Encoded` and `Output = typeof Schema.Type`. Without them TypeScript infers the field types from `defaultValues`, where `priority: 'medium'` widens to `string` and no longer matches the resolver: a typecheck error on `resolver`.
- **Input vs Output.** The fields hold `typeof Schema.Encoded` (e.g. an untrimmed string); `handleSubmit` passes `typeof Schema.Type`, which is what `mutate` takes. A `Schema.Trim` makes the two differ.
- **`noValidate`** turns off the browser's own bubbles so the schema messages are the only ones.
- **`onSubmit={(event) => void onSubmit(event)}`**: `handleSubmit` returns a Promise and typescript-eslint `no-misused-promises` rejects passing it straight to a handler prop.
- **`Controller` + `Field`**: `data-invalid={fieldState.invalid}` on `Field` (colors label and error), `aria-invalid={fieldState.invalid}` on the control (what screen readers and tests read). `FieldLabel htmlFor` must match the control `id`, because tests use `getByLabelText`.
- **`FieldGroup` + `Field`** is the shadcn form layout. The old `Form` / `FormField` wrapper is gone; do not import it.
- **Mutate callbacks**: `onSuccess` resets the form and toasts; `onError` calls `setFormErrors(form.setError, error, form.getValues())`. Pass them to `mutate`, not `useMutation`, so they die with the component.
- **Pending**: `disabled={mutation.isPending}` on submit, and a label change ("Adding…") so the state is visible.

## Server errors

`setFormErrors` (`src/lib/forms.ts`), in short:

Read the file in the project for the code.

- A `ValidationError` with `fields` puts each message under the field named by the server key. Those keys must equal your form field names; if the API names them differently, map before calling `setError`, or tell the user the contract mismatches.
- The third argument, `form.getValues()`, sends a message for a name the form has no input for (`account`, a server-only rule) to `errors.root.server` too; without it that message is set but never shown. A boilerplate from before 0.3.3 of this plugin takes two arguments: drop the third there.
- Everything else (network, 500, 403, a 422 with no fields) lands in `errors.root.server`; render it above the submit button as in the example (`Alert variant="destructive"`).

## Edit forms

Seed `defaultValues` from loaded data only after the query has succeeded (render the form inside the success branch), or pass `values`. Do not render the form during `isPending` with empty defaults and then expect it to update. For performance (many fields, `useWatch`, field arrays) read the `react-hook-form` companion, minus its zod and `integ-shadcn-*` advice.

## Other controls

Select, checkbox, textarea: add via `pnpm exec shadcn add <name>` and read the generated file in `packages/ui/src/components/` for its props before wiring it into `Controller`. Pass `aria-invalid` the same way.

For a choice from a short list, prefer `native-select` (`pnpm exec shadcn add native-select`) over the Radix `select`. The Radix one opens a portal and relies on pointer capture and `scrollIntoView`, which jsdom does not implement, so its tests need stubs and are fragile; a native `<select>` is driven with `user.selectOptions(...)` and works on phones out of the box. Use the Radix `select` only when the design needs what a native one cannot show (icons or rich content in the options), and say so in the Result.
