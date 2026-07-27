import { Capitalize } from '../../../utils/capitalize';

describe('Capitalize', () => {
  it('should capitalize first letter of each word', () => {
    expect(Capitalize('hello world')).toBe('Hello World');
  });

  it('should capitalize single word', () => {
    expect(Capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized text', () => {
    expect(Capitalize('Hello World')).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(Capitalize('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    expect(Capitalize(null as any)).toBe('');
    expect(Capitalize(undefined as any)).toBe('');
  });

  it('should handle single character', () => {
    expect(Capitalize('a')).toBe('A');
  });

  it('should handle multiple spaces', () => {
    expect(Capitalize('hello  world')).toBe('Hello  World');
  });

  it('should handle numbers', () => {
    expect(Capitalize('hello 123 world')).toBe('Hello 123 World');
  });

  it('should handle special characters', () => {
    expect(Capitalize('hello-world')).toBe('Hello-World');
  });
});
