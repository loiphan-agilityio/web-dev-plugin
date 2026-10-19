import { Schema } from 'effect';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What the sign-in and register forms collect and the API accepts (limits mirror the API:
 * email up to 254 characters, password 8-128). `Schema.Trim` makes the form's input type
 * (`CredentialsInput`) differ from the submitted one (`Credentials`).
 */
export const Credentials = Schema.Struct({
  email: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Email is required' }),
      Schema.isPattern(emailPattern, { message: 'Enter a valid email address' }),
      Schema.isMaxLength(254, { message: 'Email must be at most 254 characters' }),
    ),
  ),
  password: Schema.String.pipe(
    Schema.check(
      Schema.isMinLength(8, { message: 'Password must be at least 8 characters' }),
      Schema.isMaxLength(128, { message: 'Password must be at most 128 characters' }),
    ),
  ),
});
export type Credentials = typeof Credentials.Type;
export type CredentialsInput = typeof Credentials.Encoded;

/** The register form: credentials plus a confirmation that is checked here and never sent. */
export const Registration = Schema.Struct({
  ...Credentials.fields,
  confirmPassword: Schema.String,
}).check(
  Schema.makeFilter(
    (o) =>
      o.password === o.confirmPassword || {
        // Attached to the confirm field so the message shows under it.
        path: ['confirmPassword'],
        issue: 'Passwords do not match',
      },
  ),
);
export type Registration = typeof Registration.Type;
export type RegistrationInput = typeof Registration.Encoded;

/** What /auth/login and /auth/register answer with. */
export const AuthToken = Schema.Struct({
  token: Schema.String,
  expiresAt: Schema.String,
});
export type AuthToken = typeof AuthToken.Type;
