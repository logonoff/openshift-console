/**
 * Browser replacement for the `randomstring` npm package.
 *
 * Only `generate` is implemented, which is the sole function used by the
 * `gitlab` package (to create random upload filenames). It is aliased in
 * `rspack.config.ts` because the `gitlab` browser build still imports the
 * Node.js `crypto` built-in module through `randomstring`, which is not
 * available in the browser bundle. See CONSOLE-4360.
 *
 * The default charset matches the original package (alphanumeric characters).
 */

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generate = (length: number = 32): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
};
