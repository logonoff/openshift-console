/**
 * Browser replacement for the Node.js `querystring` module.
 *
 * Only `parse` is implemented, which is the sole function used by the bundled
 * `parse-path` package (a `git-url-parse` dependency). It is aliased in
 * `rspack.config.ts` so the browser bundle does not depend on the Node.js
 * built-in module. See CONSOLE-4360.
 *
 * The implementation follows the `querystring.parse` semantics that are
 * relevant for URL queries: split on `&`, split each pair on the first `=`,
 * convert `+` to space, lenient percent-decoding (malformed escape sequences
 * are kept literally, as Node does), and repeated keys collected into arrays.
 */

const unescapeComponent = (str: string): string => {
  try {
    // Pre-escape lone percent signs so decodeURIComponent does not throw on
    // malformed escape sequences, matching Node's lenient behavior.
    return decodeURIComponent(str.replace(/\+/g, ' ').replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
  } catch {
    return str;
  }
};

export const parse = (str: string): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};
  if (!str) {
    return result;
  }

  for (const pair of str.split('&')) {
    if (!pair) {
      continue;
    }
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);

    const decodedKey = unescapeComponent(key);
    const decodedValue = unescapeComponent(value);
    const existing = result[decodedKey];
    if (existing === undefined) {
      result[decodedKey] = decodedValue;
    } else if (Array.isArray(existing)) {
      existing.push(decodedValue);
    } else {
      result[decodedKey] = [existing, decodedValue];
    }
  }
  return result;
};
