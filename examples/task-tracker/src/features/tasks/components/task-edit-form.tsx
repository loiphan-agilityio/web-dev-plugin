import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Schema } from 'effect';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { setFormErrors } from '@/lib/forms';

import { useUpdateTask } from '../queries';
import {
  EditTask,
  type EditTaskInput,
  priorityLabels,
  statusLabels,
  type Task,
  TaskPriority,
  TaskStatus,
  toEditInput,
  toTaskPatch,
} from '../schemas';
import { useTaskGone } from '../use-task-gone';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<EditTaskInput, unknown, EditTask>(
  Schema.toStandardSchemaV1(EditTask),
);

const priorities = TaskPriority.literals;
const statuses = TaskStatus.literals;

export function TaskEditForm({ task }: { task: Task }) {
  const updateTask = useUpdateTask(task.id);
  const onTaskGone = useTaskGone();
  const form = useForm<EditTaskInput, unknown, EditTask>({
    resolver,
    defaultValues: toEditInput(task),
  });

  const onSubmit = form.handleSubmit((values) => {
    const patch = toTaskPatch(task, values);
    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      return;
    }
    updateTask.mutate(patch, {
      onSuccess: (updated) => {
        form.reset(toEditInput(updated));
        toast.success('Task updated');
      },
      onError: (error) => {
        if (error._tag === 'NotFoundError') onTaskGone(task.id);
        else setFormErrors(form.setError, error);
      },
    });
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
              <FieldLabel htmlFor="edit-task-description">Description (optional)</FieldLabel>
              <Textarea {...field} id="edit-task-description" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="edit-task-status">Status</FieldLabel>
                <NativeSelect
                  {...field}
                  id="edit-task-status"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  {statuses.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {statusLabels[status]}
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
                <NativeSelect
                  {...field}
                  id="edit-task-priority"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  {priorities.map((priority) => (
                    <NativeSelectOption key={priority} value={priority}>
                      {priorityLabels[priority]}
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
                <FieldLabel htmlFor="edit-task-due-date">Due date (optional)</FieldLabel>
                <Input
                  {...field}
                  id="edit-task-due-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                />
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
        <Button type="submit" disabled={updateTask.isPending}>
          {updateTask.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </FieldGroup>
    </form>
  );
}
