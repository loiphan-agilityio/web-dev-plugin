import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Link } from '../schemas';
import { CreatedLink } from './created-link';
import { CreateLinkForm } from './create-link-form';

export function CreateLinkPage() {
  const [created, setCreated] = useState<Link | null>(null);

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1>Create link</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {created ? (
          // Going back to the form remounts it, so it starts empty.
          <CreatedLink
            link={created}
            onCreateAnother={() => {
              setCreated(null);
            }}
          />
        ) : (
          <CreateLinkForm onCreated={setCreated} />
        )}
      </CardContent>
    </Card>
  );
}
