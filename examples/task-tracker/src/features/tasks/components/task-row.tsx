import { Link } from 'react-router';
import { toast } from 'sonner';

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { toUserMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

import { formatDueDate, isOverdue, priorityLabels, statusLabels } from '../filters';
import { useUpdateTask } from '../queries';
import { type Task, type TaskPriority, TaskStatus } from '../schemas';
import { statusClasses } from './status-classes';

const priorityDotClasses: Record<TaskPriority, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning-indicator',
  low: 'bg-muted-foreground/60',
};

interface TaskRowProps {
  readonly task: Task;
  /** Today as `YYYY-MM-DD`, passed in so every row of a list agrees. */
  readonly today: string;
}

/** One list row: a link to the detail page and a select that changes the status in place. */
export const TaskRow = ({ task, today }: TaskRowProps) => {
  const { id, title, description, status, priority, dueDate } = task;
  const updateTask = useUpdateTask();
  const overdue = isOverdue(task, today);

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 md:grid md:grid-cols-[1fr_7rem_10rem_auto]">
      <div className="min-w-0 basis-full md:basis-auto">
        <Link
          to={`/tasks/${String(id)}`}
          className={cn(
            'font-semibold hover:underline',
            status === 'done' && 'text-muted-foreground line-through',
          )}
        >
          {title}
        </Link>
        {description !== '' && (
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <span className="flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', priorityDotClasses[priority])}
        />
        <span className="sr-only">Priority: </span>
        {priorityLabels[priority]}
      </span>
      <span
        className={cn(
          'text-sm',
          overdue ? 'font-semibold text-destructive' : 'text-muted-foreground',
        )}
      >
        {dueDate === null ? (
          'No due date'
        ) : overdue ? (
          <>
            <span>Overdue</span> · <time dateTime={dueDate}>{formatDueDate(dueDate)}</time>
          </>
        ) : (
          <>
            Due <time dateTime={dueDate}>{formatDueDate(dueDate)}</time>
          </>
        )}
      </span>
      <span className="ml-auto md:ml-0 md:justify-self-end">
        <NativeSelect
          size="sm"
          className={cn(
            'rounded-full [&_select]:rounded-full [&_select]:border-transparent [&_select]:pl-3 [&_select]:text-xs [&_select]:font-semibold',
            statusClasses[status],
          )}
          aria-label={`Status of ${title}`}
          value={status}
          disabled={updateTask.isPending}
          onChange={(event) => {
            const next = TaskStatus.literals.find((value) => value === event.target.value);
            if (next === undefined) {
              return;
            }
            updateTask.mutate(
              { id, patch: { status: next } },
              {
                onError: (error) => {
                  // A 404 already toasted and refreshed the list (see useTaskGone).
                  if (error._tag !== 'NotFoundError') {
                    toast.error(toUserMessage(error));
                  }
                },
              },
            );
          }}
        >
          {TaskStatus.literals.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {statusLabels[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </span>
    </li>
  );
};
