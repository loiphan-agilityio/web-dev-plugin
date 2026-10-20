import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { Member, MemberList, type NewMember } from './schemas';

export const listMembers = Effect.fn('members.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/members', MemberList);
});

export const createMember = Effect.fn('members.create')(function* (input: NewMember) {
  const api = yield* ApiClient;
  return yield* api.post('/members', input, Member);
});

export const updateMember = Effect.fn('members.update')(function* (id: number, input: NewMember) {
  const api = yield* ApiClient;
  return yield* api.patch(`/members/${id}`, input, Member);
});

export const deleteMember = Effect.fn('members.delete')(function* (id: number) {
  const api = yield* ApiClient;
  return yield* api.delete(`/members/${id}`);
});
