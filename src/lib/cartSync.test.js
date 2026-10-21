import { describe, expect, it } from 'vitest';
import { linesToVariantPayload, syncCartWithBackend } from './cartSync.js';

describe('linesToVariantPayload', () => {
  it('handles empty or null lines safely', () => {
    expect(linesToVariantPayload([])).toEqual([]);
    expect(linesToVariantPayload(null)).toEqual([]);
    expect(linesToVariantPayload(undefined)).toEqual([]);
  });

  it('drops items for unknown product slugs', () => {
    const lines = [{ productId: 'non-existent-product', size: 'M', color: 'Black', quantity: 1 }];
    expect(linesToVariantPayload(lines)).toEqual([]);
  });
});

describe('syncCartWithBackend in demo mode', () => {
  it('returns backend_not_configured when running without Supabase', async () => {
    const result = await syncCartWithBackend();
    expect(result.ok).toBe(false);
  });
});
