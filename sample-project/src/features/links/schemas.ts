import { Schema } from 'effect';

/** A short link as the API returns it. */
export const Link = Schema.Struct({
  code: Schema.String,
  shortUrl: Schema.String,
  url: Schema.String,
  clicks: Schema.Number,
  createdAt: Schema.String,
  expiresAt: Schema.NullOr(Schema.String),
});
export type Link = typeof Link.Type;

/** GET /links: one page of the caller's links, newest first, and how many exist in all. */
export const LinkPage = Schema.Struct({
  items: Schema.Array(Link),
  total: Schema.Number,
});
export type LinkPage = typeof LinkPage.Type;

/** The body POST /links takes. Empty optional fields are left out, not sent as ''. */
export const NewLink = Schema.Struct({
  url: Schema.String,
  alias: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.String),
});
export type NewLink = typeof NewLink.Type;

// The API rejects these, since a static route (/api, /docs) would win over the alias.
const reservedAliases = ['api', 'docs'];

/**
 * What the create form collects. Limits mirror the API: an http(s) URL of at most 2048
 * characters, an alias of 3-32 letters, digits, `_` or `-`, and an expiry in the future.
 * Optional fields are '' when left empty. The checks run in order and the form shows the first
 * failing one per field. `expiresAt` is a `datetime-local` value (local time, no zone).
 */
export const NewLinkForm = Schema.Struct({
  url: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Destination URL is required' }),
      Schema.isPattern(/^https?:\/\/\S+$/, {
        message: 'Enter a URL that starts with http:// or https://',
      }),
      // Not every string that looks like http://x is a URL (e.g. a port above 65535).
      Schema.makeFilter((url) => URL.canParse(url) || 'Enter a valid URL'),
      Schema.isMaxLength(2048, { message: 'URL must be at most 2048 characters' }),
    ),
  ),
  alias: Schema.Trim.pipe(
    Schema.check(
      Schema.isPattern(/^$|^[A-Za-z0-9_-]{3,32}$/, {
        message: 'Alias must be 3-32 letters, digits, _ or -',
      }),
      Schema.makeFilter(
        (alias) => !reservedAliases.includes(alias) || `"${alias}" is reserved, pick another alias`,
      ),
    ),
  ),
  expiresAt: Schema.String.pipe(
    Schema.check(
      Schema.makeFilter(
        (value) => value === '' || Date.parse(value) > Date.now() || 'Expiry must be in the future',
      ),
    ),
  ),
});
export type NewLinkForm = typeof NewLinkForm.Type;
export type NewLinkFormInput = typeof NewLinkForm.Encoded;

/** Form values to the request body: drops empty fields, turns the local expiry into ISO 8601. */
export const toNewLink = ({ url, alias, expiresAt }: NewLinkForm): NewLink => ({
  url,
  ...(alias !== '' && { alias }),
  ...(expiresAt !== '' && { expiresAt: new Date(expiresAt).toISOString() }),
});
