import { Option, Schema } from 'effect';

export const Session = Schema.Struct({
  token: Schema.String,
  expiresAt: Schema.String,
  email: Schema.String,
});
export type Session = typeof Session.Type;

const KEY = 'session';

// Storage is untrusted input (another tab, an old build, hand edits), so it is decoded, not cast.
const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Session));

export const setSession = (session: Session) => {
  localStorage.setItem(KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(KEY);
};

/** The signed-in session, or `null` when there is none, it is corrupt, or it has expired. */
// shortcut: the token sits in localStorage, readable by any script on the page (XSS risk); the
// API only accepts a Bearer token, so an HttpOnly cookie is not possible, revisit if it adds one.
export const getSession = (): Session | null => {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return null;
  const session = decode(raw);
  // `>` is false for an unparsable date, so a bad `expiresAt` counts as expired.
  if (Option.isSome(session) && Date.parse(session.value.expiresAt) > Date.now()) {
    return session.value;
  }
  clearSession();
  return null;
};
