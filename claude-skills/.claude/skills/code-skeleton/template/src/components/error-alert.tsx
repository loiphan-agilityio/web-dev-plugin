import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ApiError, toUserMessage } from '@/lib/api/errors';

interface ErrorAlertProps {
  /** What failed: "Could not load todos". */
  title: string;
  error: ApiError;
  /** Shows a "Try again" button; pass the query's `refetch`. */
  onRetry?: () => void;
  /** Disables the button while the retry runs (the query's `isRefetching`). */
  retrying?: boolean;
}

/** The error state of a data view: the user-facing message and a retry. */
export const ErrorAlert = ({ title, error, onRetry, retrying = false }: ErrorAlertProps) => (
  <Alert variant="destructive">
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>
      <p>{toUserMessage(error)}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={retrying}
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </AlertDescription>
  </Alert>
);
