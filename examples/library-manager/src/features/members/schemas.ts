import { Schema } from 'effect';

export const MemberStatus = Schema.Literals(['active', 'suspended']);
export type MemberStatus = typeof MemberStatus.Type;

/** A library member as the API returns it. */
export const Member = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  status: MemberStatus,
  joinedAt: Schema.String,
});
export type Member = typeof Member.Type;

export const MemberList = Schema.Array(Member);

/** The create / edit form. `Trim` makes `Encoded` (`NewMemberInput`) differ from `Type`. */
export const NewMember = Schema.Struct({
  name: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Name is required' }),
      Schema.isMaxLength(120, { message: 'Keep the name under 120 characters' }),
    ),
  ),
  email: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Email is required' }),
      Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Enter a valid email address' }),
    ),
  ),
  phone: Schema.Trim.pipe(
    Schema.check(Schema.isMaxLength(30, { message: 'Keep the phone under 30 characters' })),
  ),
  status: MemberStatus,
});
export type NewMember = typeof NewMember.Type;
export type NewMemberInput = typeof NewMember.Encoded;
