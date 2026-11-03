import { generate } from '../../browser-shims/randomstring';

describe('randomstring browser shim', () => {
  it('generates a string of the requested length', () => {
    expect(generate(8)).toHaveLength(8);
    expect(generate(32)).toHaveLength(32);
  });

  it('defaults to a length of 32', () => {
    expect(generate()).toHaveLength(32);
  });

  it('only contains alphanumeric characters', () => {
    expect(generate(64)).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates different strings on subsequent calls', () => {
    expect(generate(32)).not.toBe(generate(32));
  });
});
