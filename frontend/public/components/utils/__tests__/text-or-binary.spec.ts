import { isBinary, isText } from '../text-or-binary';

describe('text-or-binary', () => {
  describe('isText', () => {
    it('returns null when neither filename nor bytes are provided', () => {
      expect(isText(null, null)).toBe(null);
      expect(isText(undefined, undefined)).toBe(null);
    });

    it('detects text contents', () => {
      expect(isText(null, new TextEncoder().encode('apiVersion: v1\nkind: Secret'))).toBe(true);
    });

    it('detects binary contents', () => {
      // Control characters and invalid UTF-8 sequences
      expect(isText(null, new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(false);
      expect(isText(null, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
        false,
      );
    });

    it('detects binary contents in the middle of large contents', () => {
      const bytes = new TextEncoder().encode('a'.repeat(1000));
      bytes[490] = 0xff; // invalid UTF-8 byte within the middle chunk
      expect(isText(null, bytes)).toBe(false);
    });

    it('detects binary contents at the end of large contents', () => {
      const bytes = new TextEncoder().encode('a'.repeat(1000));
      bytes[999] = 0x00;
      expect(isText(null, bytes)).toBe(false);
    });

    it('accepts valid multi-byte UTF-8 contents', () => {
      expect(isText(null, new TextEncoder().encode('ünïcödé 日本語 🎉'))).toBe(true);
    });

    it('returns true for text file extensions', () => {
      expect(isText('yaml-file.yaml', null)).toBe(true);
      expect(isText('/some/path/to/file.json', null)).toBe(true);
    });

    it('returns false for binary file extensions', () => {
      expect(isText('image.png', null)).toBe(false);
      expect(isText('/some/path/to/archive.zip', null)).toBe(false);
    });

    it('falls back to contents detection for unknown extensions', () => {
      expect(isText('key-without-extension', new TextEncoder().encode('some value'))).toBe(true);
      expect(isText('key-without-extension', new Uint8Array([0x00, 0x01]))).toBe(false);
    });

    it('handles secret keys like .dockerconfigjson', () => {
      // Keys with leading dots should not match any extension and fall back
      // to contents detection
      expect(isText('.dockerconfigjson', new TextEncoder().encode('{"auths":{}}'))).toBe(true);
    });

    it('treats empty contents as text', () => {
      expect(isText(null, new Uint8Array(0))).toBe(true);
    });
  });

  describe('isBinary', () => {
    it('returns null when neither filename nor bytes are provided', () => {
      expect(isBinary(null, null)).toBe(null);
    });

    it('inverts the isText result', () => {
      expect(isBinary(null, new TextEncoder().encode('hello'))).toBe(false);
      expect(isBinary(null, new Uint8Array([0x00]))).toBe(true);
      expect(isBinary('file.txt', null)).toBe(false);
      expect(isBinary('file.png', null)).toBe(true);
    });
  });
});
