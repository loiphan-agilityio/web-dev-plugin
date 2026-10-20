import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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

import { useDeleteBook } from '../queries';
import type { Book } from '../schemas';

/** Delete with a confirmation. The dialog stays open on failure, so the server's reason shows in it. */
export const BookDeleteButton = ({ book }: { book: Book }) => {
  const deleteBook = useDeleteBook();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setError(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Delete ${book.title}`}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this book?</AlertDialogTitle>
          <AlertDialogDescription>
            {`"${book.title}" will be removed from the catalogue.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteBook.isPending}
            onClick={(event) => {
              event.preventDefault();
              deleteBook.mutate(book.id, {
                onSuccess: () => {
                  setOpen(false);
                },
                onError: (failure) => {
                  setError(toUserMessage(failure));
                },
              });
            }}
          >
            {deleteBook.isPending ? 'Deleting…' : 'Delete book'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
