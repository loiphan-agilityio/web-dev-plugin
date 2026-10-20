import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { type TaskStatus, statusLabels } from '../schemas';

const statusTone: Record<TaskStatus, string> = {
  todo: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-warning text-warning-foreground',
  done: 'bg-success text-success-foreground',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge className={cn('h-6 px-3 font-semibold', statusTone[status])}>{statusLabels[status]}</Badge>;
}
