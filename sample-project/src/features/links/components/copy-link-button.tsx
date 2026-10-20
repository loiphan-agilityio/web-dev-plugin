import type { ComponentProps } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export function CopyLinkButton({
  url,
  ...props
}: { readonly url: string } & Omit<ComponentProps<typeof Button>, 'onClick' | 'children'>) {
  // writeText rejects when the browser refuses (no permission, insecure context).
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link. Select it and copy it by hand.');
    }
  };

  return (
    <Button type="button" onClick={() => void copy()} {...props}>
      Copy
    </Button>
  );
}
