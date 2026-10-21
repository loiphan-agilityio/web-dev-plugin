import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  /** What is loading, read by screen readers: "Loading todos". */
  label: string;
  /** Number of placeholder rows. */
  rows?: number;
}

/** The loading state of a data view: skeleton rows inside `role="status"`. */
export const LoadingState = ({ label, rows = 3 }: LoadingStateProps) => (
  <div role="status" aria-label={label} className="space-y-2">
    {Array.from({ length: rows }, (_, row) => (
      <Skeleton key={row} className="h-10" />
    ))}
  </div>
);
