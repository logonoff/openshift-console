import { parse } from '../../browser-shims/querystring';

describe('querystring-browser', () => {
  it('parses basic query strings', () => {
    expect(parse('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('parses keys without values', () => {
    expect(parse('a')).toEqual({ a: '' });
  });

  it('collects repeated keys into arrays', () => {
    expect(parse('a=1&a=2')).toEqual({ a: ['1', '2'] });
  });

  it('does not treat semicolons as separators', () => {
    expect(parse('a=1;b=2')).toEqual({ a: '1;b=2' });
  });

  it('decodes percent escapes', () => {
    expect(parse('a=b%20c')).toEqual({ a: 'b c' });
  });

  it('converts plus signs to spaces', () => {
    expect(parse('a=b+c')).toEqual({ a: 'b c' });
  });

  it('keeps malformed escape sequences literally', () => {
    expect(parse('a=%zz')).toEqual({ a: '%zz' });
    expect(parse('a=b%')).toEqual({ a: 'b%' });
  });

  it('returns an empty object for empty input', () => {
    expect(parse('')).toEqual({});
  });

  it('skips empty pairs', () => {
    expect(parse('a=b&&c=d')).toEqual({ a: 'b', c: 'd' });
  });

  it('splits on the first equals sign only', () => {
    expect(parse('a=b=c')).toEqual({ a: 'b=c' });
  });

  it('supports empty keys', () => {
    expect(parse('=b')).toEqual({ '': 'b' });
  });
});
