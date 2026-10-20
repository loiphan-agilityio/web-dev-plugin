import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Member } from '../schemas';
import { MemberForm } from './member-form';
import { MemberList } from './member-list';

export const MembersPage = () => {
  const [editing, setEditing] = useState<Member | null>(null);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Members</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{editing ? 'Edit member' : 'Add a member'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberForm
            key={editing?.id ?? 'new'}
            member={editing ?? undefined}
            onDone={() => {
              setEditing(null);
            }}
          />
        </CardContent>
      </Card>
      <MemberList onEdit={setEditing} />
    </section>
  );
};
