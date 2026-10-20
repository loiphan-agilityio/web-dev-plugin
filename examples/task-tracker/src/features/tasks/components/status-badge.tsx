import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { statusLabels } from '../filters';
import type { TaskStatus } from '../schemas';
import { statusClasses } from './status-classes';

export const StatusBadge = ({ status }: { readonly status: TaskStatus }) => (
  <Badge className={cn('h-6 px-3 font-semibold', statusClasses[status])}>
    {statusLabels[status]}
  </Badge>
);
