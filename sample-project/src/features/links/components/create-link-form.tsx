import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Schema } from 'effect';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { setFormErrors } from '@/lib/forms';

import { useCreateLink } from '../queries';
import { type Link, NewLinkForm, type NewLinkFormInput, toNewLink } from '../schemas';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<NewLinkFormInput, unknown, NewLinkForm>(
  Schema.toStandardSchemaV1(NewLinkForm),
);

export function CreateLinkForm({ onCreated }: { readonly onCreated: (link: Link) => void }) {
  const createLink = useCreateLink();
  const form = useForm<NewLinkFormInput, unknown, NewLinkForm>({
    resolver,
    defaultValues: { url: '', alias: '', expiresAt: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    createLink.mutate(toNewLink(values), {
      onSuccess: (link) => {
        toast.success('Link created');
        onCreated(link);
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
          name="url"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="link-url">Destination URL</FieldLabel>
              <Input
                {...field}
                id="link-url"
                type="url"
                autoComplete="url"
                placeholder="https://example.com/a/very/long/path"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="alias"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="link-alias">Custom alias (optional)</FieldLabel>
              <Input
                {...field}
                id="link-alias"
                autoComplete="off"
                placeholder="my-link"
                aria-invalid={fieldState.invalid}
                aria-describedby="link-alias-description"
              />
              <FieldDescription id="link-alias-description">
                Leave empty for a random code
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="expiresAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="link-expires-at">Expires (optional)</FieldLabel>
              <Input
                {...field}
                id="link-expires-at"
                type="datetime-local"
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
        <Button type="submit" disabled={createLink.isPending}>
          {createLink.isPending ? 'Creating…' : 'Create link'}
        </Button>
      </FieldGroup>
    </form>
  );
}
