/**
 * Text/binary detection for filenames and file contents.
 *
 * This is a browser-native port of the `istextorbinary` package, whose browser
 * edition still relies on Node.js APIs (`path` module and `Buffer`) that are
 * not natively available in the browser bundle. See CONSOLE-4360.
 *
 * Detection is determined by extension checks first (if a filename is
 * available), otherwise a slower encoding detection is performed on the
 * contents. This order is done as extension checks are quicker, and also
 * because encoding checks cannot guarantee accuracy for characters between
 * utf8 and utf16.
 *
 * The extension checks are performed using the resources
 * https://github.com/bevry/textextensions and
 * https://github.com/bevry/binaryextensions
 */
import binaryExtensions from 'binaryextensions';
import textExtensions from 'textextensions';

const utf8Decoder = new TextDecoder('utf-8');

const CHAR_CODE_SLASH = 47; // '/'

/** POSIX-style basename, equivalent to `path.basename` for browser purposes. */
const basename = (filename: string): string => {
  let end = filename.length;
  // Strip trailing slashes
  while (end > 0 && filename.charCodeAt(end - 1) === CHAR_CODE_SLASH) {
    end--;
  }
  const start = filename.lastIndexOf('/', end - 1) + 1;
  return filename.slice(start, end);
};

// ====================================
// The functions below are created to handle multibyte utf8 characters.
// To understand how the encoding works, check this article:
// https://en.wikipedia.org/wiki/UTF-8#Encoding

// eslint-disable-next-line no-bitwise
const isFirstByteOf4ByteChar = (byte: number) => byte >> 3 === 30; // 11110xxx?
// eslint-disable-next-line no-bitwise
const isFirstByteOf3ByteChar = (byte: number) => byte >> 4 === 14; // 1110xxxx?
// eslint-disable-next-line no-bitwise
const isFirstByteOf2ByteChar = (byte: number) => byte >> 5 === 6; // 110xxxxx?
// eslint-disable-next-line no-bitwise
const isLaterByteOfUtf8 = (byte: number) => byte >> 6 === 2; // 10xxxxxx?

const getChunkBegin = (bytes: Uint8Array, chunkBegin: number): number => {
  // If it's the beginning, just return.
  if (chunkBegin === 0) {
    return 0;
  }
  if (!isLaterByteOfUtf8(bytes[chunkBegin])) {
    return chunkBegin;
  }
  let begin = chunkBegin - 3;
  if (begin >= 0) {
    if (isFirstByteOf4ByteChar(bytes[begin])) {
      return begin;
    }
  }
  begin = chunkBegin - 2;
  if (begin >= 0) {
    if (isFirstByteOf4ByteChar(bytes[begin]) || isFirstByteOf3ByteChar(bytes[begin])) {
      return begin;
    }
  }
  begin = chunkBegin - 1;
  if (begin >= 0) {
    // Is it a 4-byte, 3-byte utf8 character?
    if (
      isFirstByteOf4ByteChar(bytes[begin]) ||
      isFirstByteOf3ByteChar(bytes[begin]) ||
      isFirstByteOf2ByteChar(bytes[begin])
    ) {
      return begin;
    }
  }
  return -1;
};

const getChunkEnd = (bytes: Uint8Array, chunkEnd: number): number => {
  // If it's the end, just return.
  if (chunkEnd === bytes.length) {
    return chunkEnd;
  }
  let index = chunkEnd - 3;
  if (index >= 0) {
    if (isFirstByteOf4ByteChar(bytes[index])) {
      return chunkEnd + 1;
    }
  }
  index = chunkEnd - 2;
  if (index >= 0) {
    if (isFirstByteOf4ByteChar(bytes[index])) {
      return chunkEnd + 2;
    }
    if (isFirstByteOf3ByteChar(bytes[index])) {
      return chunkEnd + 1;
    }
  }
  index = chunkEnd - 1;
  if (index >= 0) {
    if (isFirstByteOf4ByteChar(bytes[index])) {
      return chunkEnd + 3;
    }
    if (isFirstByteOf3ByteChar(bytes[index])) {
      return chunkEnd + 2;
    }
    if (isFirstByteOf2ByteChar(bytes[index])) {
      return chunkEnd + 1;
    }
  }
  return chunkEnd;
};

type Encoding = 'utf8' | 'binary';

/**
 * Get the encoding of the given contents.
 *
 * Checks the start, middle, and end of the contents for characters that are
 * unrecognized within UTF8 encoding. History has shown that inspection at all
 * three locations is necessary.
 *
 * @returns `null` if `bytes` was not provided. Otherwise either `'utf8'` or
 * `'binary'`.
 */
const getEncoding = (
  bytes: Uint8Array,
  opts?: { chunkLength?: number; chunkBegin?: number },
): Encoding | null => {
  const chunkLength = opts?.chunkLength ?? 24;
  let chunkBegin = opts?.chunkBegin ?? 0;

  if (opts?.chunkBegin == null) {
    // Start
    let encoding = getEncoding(bytes, { chunkLength, chunkBegin });
    if (encoding === 'utf8') {
      // Middle
      chunkBegin = Math.max(0, Math.floor(bytes.length / 2) - chunkLength);
      encoding = getEncoding(bytes, { chunkLength, chunkBegin });
      if (encoding === 'utf8') {
        // End
        chunkBegin = Math.max(0, bytes.length - chunkLength);
        encoding = getEncoding(bytes, { chunkLength, chunkBegin });
      }
    }
    return encoding;
  }

  // Extract
  chunkBegin = getChunkBegin(bytes, chunkBegin);
  if (chunkBegin === -1) {
    return 'binary';
  }
  const chunkEnd = getChunkEnd(bytes, Math.min(bytes.length, chunkBegin + chunkLength));
  if (chunkEnd > bytes.length) {
    return 'binary';
  }
  const contentChunkUTF8 = utf8Decoder.decode(bytes.subarray(chunkBegin, chunkEnd));
  // Detect encoding
  for (let i = 0; i < contentChunkUTF8.length; ++i) {
    const charCode = contentChunkUTF8.charCodeAt(i);
    if (charCode === 65533 || charCode <= 8) {
      // 8 and below are control characters (e.g. backspace, null, eof, etc.)
      // 65533 is the unknown character
      return 'binary';
    }
  }
  return 'utf8';
};

/**
 * Determine if the filename and/or contents are text.
 *
 * @returns `null` if neither `filename` nor `bytes` were provided. Otherwise a
 * boolean value with the detection result.
 */
export const isText = (filename?: string | null, bytes?: Uint8Array | null): boolean | null => {
  // Test extensions
  if (filename) {
    const parts = basename(filename).split('.').reverse();
    // Cycle extensions
    for (const extension of parts) {
      if (textExtensions.indexOf(extension) !== -1) {
        return true;
      }
      if (binaryExtensions.indexOf(extension) !== -1) {
        return false;
      }
    }
  }
  // Fallback to encoding if extension check was not enough
  if (bytes) {
    return getEncoding(bytes) === 'utf8';
  }
  // No contents were provided
  return null;
};

/**
 * Determine if the filename and/or contents are binary.
 *
 * @returns `null` if neither `filename` nor `bytes` were provided. Otherwise a
 * boolean value with the detection result.
 */
export const isBinary = (filename?: string | null, bytes?: Uint8Array | null): boolean | null => {
  const text = isText(filename, bytes);
  if (text == null) {
    return null;
  }
  return !text;
};
