import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Schema } from 'effect';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { setFormErrors } from '@/lib/forms';

import { useCreateTask } from '../queries';
import { NewTask, type NewTaskInput, priorityLabels, TaskPriority } from '../schemas';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<NewTaskInput, unknown, NewTask>(
  Schema.toStandardSchemaV1(NewTask),
);

const defaultValues: NewTaskInput = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
};

const priorities = TaskPriority.literals;

export function TaskForm() {
  const createTask = useCreateTask();
  const form = useForm<NewTaskInput, unknown, NewTask>({ resolver, defaultValues });

  const onSubmit = form.handleSubmit((values) => {
    createTask.mutate(values, {
      onSuccess: () => {
        form.reset();
        toast.success('Task created');
      },
      onError: (error) => {
        setFormErrors(form.setError, error);
      },
    });
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <form noValidate aria-label="New task" onSubmit={(event) => void onSubmit(event)}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">New task</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid items-start gap-4 sm:grid-cols-[1fr_14rem_14rem]">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="task-title">Title</FieldLabel>
                    <Input
                      {...field}
                      id="task-title"
                      placeholder="What needs to be done?"
                      className="h-10"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="priority"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
                    <NativeSelect
                      {...field}
                      id="task-priority"
                      className="w-full [&_select]:h-10"
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
                    <FieldLabel htmlFor="task-due-date">
                      Due date<span className="sr-only"> (optional)</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="task-due-date"
                      type="date"
                      className="h-10"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="task-description">
                    Description<span className="sr-only"> (optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="task-description"
                    placeholder="Optional details"
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
            <Button type="submit" size="lg" className="h-10 w-fit px-4" disabled={createTask.isPending}>
              <PlusIcon />
              {createTask.isPending ? 'Adding…' : 'Add task'}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
