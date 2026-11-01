import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { _resetForTests, canSpend, recordSpend } from './guard';

describe('unit guard', () => {
  beforeEach(() => {
    _resetForTests();
    process.env.YOUCAM_SESSION_UNIT_CAP = '26';
    process.env.YOUCAM_DAILY_UNIT_CAP = '40';
    delete process.env.LIVE_MODE;
  });
  afterEach(() => _resetForTests());

  test('one complete look fits the visitor cap, a second does not', () => {
    expect(canSpend('a', 20).ok).toBe(true);
    recordSpend('a', 20);
    expect(canSpend('a', 6).ok).toBe(true);
    recordSpend('a', 6);
    const r = canSpend('a', 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('visitor');
  });

  test('the daily cap covers all visitors together', () => {
    recordSpend('a', 20);
    recordSpend('b', 20);
    const r = canSpend('c', 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/sample shoppers/);
  });

  test('LIVE_MODE=off stops all paid calls', () => {
    process.env.LIVE_MODE = 'off';
    expect(canSpend('a', 1).ok).toBe(false);
  });
});
