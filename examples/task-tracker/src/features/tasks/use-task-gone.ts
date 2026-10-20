import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { taskKeys } from './queries';

/**
 * What to do when a PATCH or DELETE answers 404: someone else deleted the task. Tells the user,
 * refreshes the list and forgets the task's detail. `leave: false` stays on the current screen
 * (the list already is the place to go back to).
 */
export const useTaskGone = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (id: number, { leave = true }: { leave?: boolean } = {}) => {
    toast.error('This task no longer exists');
    queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    if (leave) void navigate('/tasks');
  };
};
