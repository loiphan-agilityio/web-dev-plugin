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

import { useDeleteMember } from '../queries';
import type { Member } from '../schemas';

/** Delete with a confirmation. The dialog stays open on failure, so the server's reason shows in it. */
export const MemberDeleteButton = ({ member }: { member: Member }) => {
  const deleteMember = useDeleteMember();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setError(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Delete ${member.name}`}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this member?</AlertDialogTitle>
          <AlertDialogDescription>
            {`${member.name} will be removed from the library.`}
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
            disabled={deleteMember.isPending}
            onClick={(event) => {
              event.preventDefault();
              deleteMember.mutate(member.id, {
                onSuccess: () => {
                  setOpen(false);
                },
                onError: (failure) => {
                  setError(toUserMessage(failure));
                },
              });
            }}
          >
            {deleteMember.isPending ? 'Deleting…' : 'Delete member'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
