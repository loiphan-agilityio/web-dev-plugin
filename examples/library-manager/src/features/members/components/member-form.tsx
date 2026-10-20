import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { ApiError } from '@/lib/api/errors';
import { setFormErrors } from '@/lib/forms';

import { useCreateMember, useUpdateMember } from '../queries';
import { type Member, NewMember, type NewMemberInput } from '../schemas';

// Built once at module level. The fields hold NewMember.Encoded (untrimmed), handleSubmit
// passes NewMember.Type (trimmed).
const resolver = effectTsResolver(NewMember);

const textFields = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel' },
] as const;

const emptyValues: NewMemberInput = { name: '', email: '', phone: '', status: 'active' };

const valuesOf = ({ name, email, phone, status }: Member): NewMemberInput => ({
  name,
  email,
  phone,
  status,
});

interface MemberFormProps {
  /** The member to edit; without it the form adds a new one. */
  member?: Member;
  /** Called after a successful edit, so the page can close the form. */
  onDone?: () => void;
}

export const MemberForm = ({ member, onDone }: MemberFormProps) => {
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  // Type arguments: inferred from defaultValues, `status` would widen to string.
  const form = useForm<NewMemberInput, unknown, NewMember>({
    resolver,
    defaultValues: member ? valuesOf(member) : emptyValues,
  });

  const onError = (error: ApiError) => {
    setFormErrors(form.setError, error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (member) {
      updateMember.mutate(
        { id: member.id, input: values },
        {
          onSuccess: () => {
            toast.success('Member updated');
            onDone?.();
          },
          onError,
        },
      );
      return;
    }
    createMember.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success('Member created');
      },
      onError,
    });
  });

  const isPending = createMember.isPending || updateMember.isPending;
  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {textFields.map(({ name, label, type }) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`member-${name}`}>{label}</FieldLabel>
                  <Input
                    {...field}
                    id={`member-${name}`}
                    type={type}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="member-status">Status</FieldLabel>
                <NativeSelect {...field} id="member-status" aria-invalid={fieldState.invalid}>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
                </NativeSelect>
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
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {member
              ? isPending
                ? 'Saving…'
                : 'Save member'
              : isPending
                ? 'Adding…'
                : 'Add member'}
          </Button>
          {member && (
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
};
