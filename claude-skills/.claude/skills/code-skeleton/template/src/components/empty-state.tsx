import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Says what to do next: "No todos yet. Add the first one above." */
  message: string;
  /** An optional button or link for that next step. */
  action?: ReactNode;
}

/** The empty state of a data view. Plain text, never styled as an error. */
export const EmptyState = ({ message, action }: EmptyStateProps) => (
  <div className="space-y-2">
    <p className="text-muted-foreground">{message}</p>
    {action}
  </div>
);
