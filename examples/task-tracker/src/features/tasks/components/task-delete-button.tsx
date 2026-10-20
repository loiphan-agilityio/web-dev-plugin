import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/api/errors';

import { useDeleteTask } from '../queries';
import type { Task } from '../schemas';
import { useTaskGone } from '../use-task-gone';

/** Deleting asks first; only the dialog's confirm button sends `DELETE`. */
export function TaskDeleteButton({ task }: { task: Task }) {
  const deleteTask = useDeleteTask(task.id);
  const navigate = useNavigate();
  const onTaskGone = useTaskGone();

  const confirm = () => {
    deleteTask.mutate(undefined, {
      onSuccess: () => {
        void navigate('/tasks');
        toast.success('Task deleted');
      },
      onError: (error) => {
        if (error._tag === 'NotFoundError') onTaskGone(task.id);
        else toast.error(toUserMessage(error));
      },
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={deleteTask.isPending}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            “{task.title}” will be removed for good. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm}>
            Delete task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
