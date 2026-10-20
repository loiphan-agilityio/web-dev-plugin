import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';
import { createLibraryDb, type LibraryDb, nextId, openLoans } from '@/mocks/library-db';

import type { Member, NewMember } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

const invalid = (errors: Record<string, string>) =>
  HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 });

const emailTaken = { email: 'A member with this email already exists' };

/**
 * The members half of the in-memory backend. `db` is shared with the books and loans handlers
 * (members with open loans cannot be deleted); with no argument it is a fresh copy of the fixtures.
 */
export const createMembersHandlers = (db: LibraryDb = createLibraryDb()) => [
  http.get(url('/members'), () => HttpResponse.json(db.members)),
  http.post<never, NewMember>(url('/members'), async ({ request }) => {
    const input = await request.json();
    if (db.members.some(({ email }) => email.toLowerCase() === input.email.toLowerCase())) {
      return invalid(emailTaken);
    }
    const member: Member = {
      id: nextId(db.members),
      ...input,
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    db.members.push(member);
    return HttpResponse.json(member, { status: 201 });
  }),
  http.patch<{ id: string }, NewMember>(url('/members/:id'), async ({ params, request }) => {
    const member = db.members.find(({ id }) => id === Number(params.id));
    if (!member) return HttpResponse.json({ message: 'Member not found' }, { status: 404 });
    const input = await request.json();
    if (
      db.members.some(
        ({ id, email }) => id !== member.id && email.toLowerCase() === input.email.toLowerCase(),
      )
    ) {
      return invalid(emailTaken);
    }
    Object.assign(member, input);
    return HttpResponse.json(member);
  }),
  http.delete<{ id: string }>(url('/members/:id'), ({ params }) => {
    const index = db.members.findIndex(({ id }) => id === Number(params.id));
    const member = db.members[index];
    if (!member) return HttpResponse.json({ message: 'Member not found' }, { status: 404 });
    if (openLoans(db, { memberId: member.id }).length > 0) {
      return HttpResponse.json(
        { message: 'This member has active loans and cannot be deleted.' },
        { status: 409 },
      );
    }
    db.members.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

/** One-off responses for the states a test or story needs to drive. */
export const membersMocks = {
  listPending: () =>
    http.get(url('/members'), async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  listError: (status = 500) =>
    http.get(url('/members'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/members'), () => invalid(errors)),
  createError: (status = 500) =>
    http.post(url('/members'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  updateInvalid: (errors: Record<string, string>) =>
    http.patch(url('/members/:id'), () => invalid(errors)),
  deleteConflict: (message = 'This member has active loans and cannot be deleted.') =>
    http.delete(url('/members/:id'), () => HttpResponse.json({ message }, { status: 409 })),
};
