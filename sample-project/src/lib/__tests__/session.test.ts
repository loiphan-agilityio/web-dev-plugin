import { clearSession, getSession, type Session, setSession } from '../session';

const session: Session = {
  token: 'abc',
  expiresAt: '2099-01-01T00:00:00.000Z',
  email: 'alice@example.com',
};

describe('session', () => {
  it('returns what was stored', () => {
    setSession(session);
    expect(getSession()).toEqual(session);
  });

  it('returns null when nothing is stored, and after clearSession', () => {
    expect(getSession()).toBeNull();
    setSession(session);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it('drops an expired session from storage', () => {
    setSession({ ...session, expiresAt: '2000-01-01T00:00:00.000Z' });
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
  });

  it.each([
    ['not json', 'not json'],
    ['json of the wrong shape', '{"token":1}'],
    ['json null', 'null'],
    ['an unparsable expiry', JSON.stringify({ ...session, expiresAt: 'soon' })],
  ])('treats %s as signed out and removes it', (_name, raw) => {
    localStorage.setItem('session', raw);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
  });
});
