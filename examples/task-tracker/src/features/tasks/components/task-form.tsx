import { effectTsResolver } from '@hookform/resolvers/effect-ts';
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

import { priorityLabels } from '../filters';
import { useCreateTask } from '../queries';
import { NewTask, type NewTaskInput, TaskPriority } from '../schemas';

// Built once at module level. The fields hold NewTask.Encoded (untrimmed title, '' for no
// date), handleSubmit passes NewTask.Type (trimmed title, null for no date).
const resolver = effectTsResolver(NewTask);

const defaultValues: NewTaskInput = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
};

export const TaskForm = () => {
  const createTask = useCreateTask();
  // Type arguments, so `priority` stays a literal union instead of widening to string.
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
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">New task</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
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
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
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
                  <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
                  <Input
                    {...field}
                    id="task-due-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="md:col-span-3">
                  <FieldLabel htmlFor="task-description">Description</FieldLabel>
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
              <Alert variant="destructive" className="md:col-span-3">
                <AlertDescription>{serverError.message}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-fit md:col-span-3" disabled={createTask.isPending}>
              <PlusIcon />
              {createTask.isPending ? 'Adding…' : 'Add task'}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
};
