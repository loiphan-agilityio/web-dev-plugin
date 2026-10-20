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

/** Asks for confirmation, deletes, then goes back to the list. */
export const DeleteTaskButton = ({ task }: { readonly task: Task }) => {
  const deleteTask = useDeleteTask();
  const navigate = useNavigate();

  const confirm = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task deleted');
        void navigate('/tasks');
      },
      onError: (error) => {
        if (error._tag === 'NotFoundError') {
          // Already toasted and refreshed the list (see useTaskGone).
          void navigate('/tasks');
          return;
        }
        toast.error(toUserMessage(error));
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
          <AlertDialogAction onClick={confirm}>Delete task</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
