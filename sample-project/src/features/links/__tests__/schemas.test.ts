import { Schema } from 'effect';

import { linkFixture } from '../mocks';
import { LinkPage, NewLinkForm, toNewLink } from '../schemas';

const decode = Schema.decodeUnknownSync(NewLinkForm);
const valid = { url: 'https://example.com/a?b=1', alias: '', expiresAt: '' };

describe('NewLinkForm', () => {
  it('accepts a URL and trims it', () => {
    expect(decode({ ...valid, url: '  https://example.com  ' })).toEqual({
      ...valid,
      url: 'https://example.com',
    });
  });

  it('accepts an alias and a future expiry', () => {
    expect(decode({ ...valid, alias: 'my-link_1', expiresAt: '2099-01-01T10:00' }).alias).toBe(
      'my-link_1',
    );
  });

  it.each([
    ['a missing URL', { url: '   ' }, 'Destination URL is required'],
    ['a non-http scheme', { url: 'ftp://example.com' }, 'starts with http'],
    ['javascript:', { url: 'javascript:alert(1)' }, 'starts with http'],
    ['a space inside the URL', { url: 'https://exa mple.com' }, 'starts with http'],
    ['an unparsable URL', { url: 'https://example.com:99999' }, 'Enter a valid URL'],
    ['a too long URL', { url: `https://example.com/${'a'.repeat(2048)}` }, 'at most 2048'],
    ['a short alias', { alias: 'ab' }, 'Alias must be 3-32'],
    ['a long alias', { alias: 'a'.repeat(33) }, 'Alias must be 3-32'],
    ['an alias with a bad character', { alias: 'my link' }, 'Alias must be 3-32'],
    ['a reserved alias', { alias: 'api' }, '"api" is reserved'],
    ['a reserved alias (docs)', { alias: 'docs' }, '"docs" is reserved'],
    ['a past expiry', { expiresAt: '2000-01-01T10:00' }, 'Expiry must be in the future'],
  ])('rejects %s', (_name, patch, message) => {
    expect(() => decode({ ...valid, ...patch })).toThrow(message);
  });
});

describe('toNewLink', () => {
  it('drops empty alias and expiry', () => {
    expect(toNewLink(valid)).toEqual({ url: valid.url });
  });

  it('keeps the alias and sends the expiry as ISO 8601', () => {
    const expiresAt = '2099-01-01T10:00';
    expect(toNewLink({ ...valid, alias: 'demo', expiresAt })).toEqual({
      url: valid.url,
      alias: 'demo',
      // The input is local time, so build the expectation the same way: the test passes in any zone.
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });
});

describe('LinkPage', () => {
  const decodePage = Schema.decodeUnknownSync(LinkPage);

  it('decodes a page of links and the total', () => {
    expect(decodePage({ items: [linkFixture], total: 1 })).toEqual({
      items: [linkFixture],
      total: 1,
    });
  });

  it('rejects a body without total', () => {
    expect(() => decodePage({ items: [linkFixture] })).toThrow();
  });
});
