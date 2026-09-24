import { describe, expect, it } from 'vitest';
import { isPasscode } from './passcode';

describe('isPasscode', () => {
  it('đúng mã thì qua, sai thì không', () => {
    expect(isPasscode('300920')).toBe(true);
    expect(isPasscode('300921')).toBe(false);
    expect(isPasscode('')).toBe(false);
  });
});
