import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

import { formatDueDate, isOverdue } from '../dates';
import { useTaskFilters } from '../filters';
import { taskListQueryOptions, useUpdateTask } from '../queries';
import {
  priorityLabels,
  type Task,
  type TaskPriority,
  TaskStatus,
  statusLabels,
} from '../schemas';
import { useTaskGone } from '../use-task-gone';

const priorityDot: Record<TaskPriority, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
};

// The status select is dressed as the status badge; the tones mirror the ones in task-status-badge.tsx.
const statusSelectTone: Record<TaskStatus, string> = {
  todo: '[&_select]:bg-secondary [&_select]:text-secondary-foreground',
  in_progress: '[&_select]:bg-warning [&_select]:text-warning-foreground',
  done: '[&_select]:bg-success [&_select]:text-success-foreground',
};

const statusSelectShape =
  'w-fit [&_select]:h-6 [&_select]:rounded-full [&_select]:border-transparent [&_select]:pr-7 [&_select]:pl-3 [&_select]:text-xs [&_select]:font-semibold [&_svg]:right-2 [&_svg]:size-3';

function TaskRow({ task }: { task: Task }) {
  const overdue = isOverdue(task);
  const updateTask = useUpdateTask(task.id);
  const onTaskGone = useTaskGone();

  const changeStatus = (status: TaskStatus) => {
    updateTask.mutate(
      { status },
      {
        onError: (error) => {
          if (error._tag === 'NotFoundError') onTaskGone(task.id, { leave: false });
          else toast.error(toUserMessage(error));
        },
      },
    );
  };

  return (
    <li className="grid items-center gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[1fr_7rem_10rem_auto]">
      <div className="min-w-0">
        <Link to={`/tasks/${task.id}`} className="font-semibold hover:underline">
          {task.title}
        </Link>
        {task.description !== '' && (
          <p className="truncate text-sm text-muted-foreground">{task.description}</p>
        )}
      </div>
      <span className="flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', priorityDot[task.priority])}
        />
        <span>
          <span className="sr-only">Priority: </span>
          {priorityLabels[task.priority]}
        </span>
      </span>
      <span
        className={cn(
          'text-sm text-muted-foreground',
          overdue && 'font-semibold text-destructive',
        )}
      >
        {task.dueDate === null
          ? 'No due date'
          : overdue
            ? `Overdue · ${formatDueDate(task.dueDate)}`
            : `Due ${formatDueDate(task.dueDate)}`}
      </span>
      <NativeSelect
        aria-label={`Status of ${task.title}`}
        className={cn(
          'justify-self-start sm:justify-self-end',
          statusSelectShape,
          statusSelectTone[task.status],
        )}
        value={task.status}
        disabled={updateTask.isPending}
        onChange={(event) => {
          changeStatus(event.target.value as TaskStatus);
        }}
      >
        {TaskStatus.literals.map((status) => (
          <NativeSelectOption key={status} value={status}>
            {statusLabels[status]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </li>
  );
}

/** Loading, error, empty (nothing yet / nothing matches) and success are different screens. */
export function TaskList() {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery(
    taskListQueryOptions(),
  );
  const { status, q, isFiltered, clear } = useTaskFilters();

  // isPending is true only before the first result, so a background refetch keeps the list.
  if (isPending) {
    return (
      <div role="status" aria-label="Loading tasks" className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load tasks</AlertTitle>
        <AlertDescription>
          <p>{toUserMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground">No tasks yet. Add the first one above.</p>;
  }

  const query = q.trim().toLowerCase();
  const visible = data.filter(
    (task) =>
      (status === 'all' || task.status === status) && task.title.toLowerCase().includes(query),
  );

  if (visible.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">No tasks match your filters.</p>
        {isFiltered && (
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul aria-label="Tasks" className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {visible.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
