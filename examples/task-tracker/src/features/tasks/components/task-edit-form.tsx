import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { setFormErrors } from '@/lib/forms';

import { priorityLabels, statusLabels } from '../filters';
import { changedFields, toEditInput } from '../patch';
import { useUpdateTask } from '../queries';
import { type Task, TaskEdit, type TaskEditInput, TaskPriority, TaskStatus } from '../schemas';

// Built once at module level. The fields hold TaskEdit.Encoded (untrimmed title, '' for no
// date), handleSubmit passes TaskEdit.Type (trimmed title, null for no date).
const resolver = effectTsResolver(TaskEdit);

export const TaskEditForm = ({ task }: { readonly task: Task }) => {
  const updateTask = useUpdateTask();
  const navigate = useNavigate();
  const form = useForm<TaskEditInput, unknown, TaskEdit>({
    resolver,
    defaultValues: toEditInput(task),
  });

  const onSubmit = form.handleSubmit((values) => {
    const patch = changedFields(task, values);
    if (Object.keys(patch).length === 0) {
      return;
    }
    updateTask.mutate(
      { id: task.id, patch },
      {
        onSuccess: (updated) => {
          form.reset(toEditInput(updated));
          toast.success('Task updated');
        },
        onError: (error) => {
          if (error._tag === 'NotFoundError') {
            void navigate('/tasks');
            return;
          }
          setFormErrors(form.setError, error);
        },
      },
    );
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate aria-label="Edit task" onSubmit={(event) => void onSubmit(event)}>
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-task-title">Title</FieldLabel>
              <Input {...field} id="edit-task-title" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-task-description">Description</FieldLabel>
              <Textarea {...field} id="edit-task-description" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="status"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-task-status">Status</FieldLabel>
              <NativeSelect {...field} id="edit-task-status" aria-invalid={fieldState.invalid}>
                {TaskStatus.literals.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {statusLabels[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="priority"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-task-priority">Priority</FieldLabel>
              <NativeSelect {...field} id="edit-task-priority" aria-invalid={fieldState.invalid}>
                {TaskPriority.literals.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {priorityLabels[value]}
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
              <FieldLabel htmlFor="edit-task-due-date">Due date</FieldLabel>
              <Input
                {...field}
                id="edit-task-due-date"
                type="date"
                className="w-fit"
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
        <Button type="submit" disabled={updateTask.isPending || !form.formState.isDirty}>
          {updateTask.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </FieldGroup>
    </form>
  );
};
