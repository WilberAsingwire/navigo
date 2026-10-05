import { describe, it, expect } from 'vitest';
import { normalizeUgPhone, prettyUgPhone, firstName } from './uganda';

describe('normalizeUgPhone', () => {
  it('normalizes every common Ugandan input format to +2567XXXXXXXX', () => {
    expect(normalizeUgPhone('0772123456')).toBe('+256772123456');
    expect(normalizeUgPhone('772123456')).toBe('+256772123456');
    expect(normalizeUgPhone('256772123456')).toBe('+256772123456');
    expect(normalizeUgPhone('+256772123456')).toBe('+256772123456');
    expect(normalizeUgPhone('0772 123 456')).toBe('+256772123456');
    expect(normalizeUgPhone('0772-123-456')).toBe('+256772123456');
  });

  it('rejects non-mobile and malformed numbers', () => {
    expect(normalizeUgPhone('0412123456')).toBeNull();   // landline (041…)
    expect(normalizeUgPhone('077212345')).toBeNull();    // too short
    expect(normalizeUgPhone('07721234567')).toBeNull();  // too long
    expect(normalizeUgPhone('hello')).toBeNull();
    expect(normalizeUgPhone('')).toBeNull();
    expect(normalizeUgPhone('+254712123456')).toBeNull(); // Kenyan number
  });
});

describe('prettyUgPhone', () => {
  it('formats a normalized number for display', () => {
    expect(prettyUgPhone('+256772123456')).toBe('+256 772 123 456');
  });
  it('passes through anything it cannot parse', () => {
    expect(prettyUgPhone('0772123456')).toBe('0772123456');
  });
});

describe('firstName', () => {
  it('extracts the first name', () => {
    expect(firstName('Wilber Asingwire')).toBe('Wilber');
  });
});
