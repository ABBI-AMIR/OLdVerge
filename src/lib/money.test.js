import { describe, expect, it } from 'vitest';
import { FREE_SHIPPING_THRESHOLD, amountToFreeShipping, computeTotals, formatPrice, shippingCost, shippingOption } from './money.js';

describe('formatPrice', () => {
  it('formats whole PKR with grouping and no decimals', () => {
    expect(formatPrice(8490)).toBe('PKR 8,490');
    expect(formatPrice(109000)).toBe('PKR 109,000');
  });
});

describe('shipping (demo rules)', () => {
  it('charges nothing for an empty bag', () => {
    expect(shippingCost('standard', 0)).toBe(0);
  });

  it('applies the free-standard-delivery threshold exactly at the limit', () => {
    expect(shippingCost('standard', FREE_SHIPPING_THRESHOLD - 1)).toBe(shippingOption('standard').price);
    expect(shippingCost('standard', FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it('never makes express delivery free', () => {
    expect(shippingCost('express', FREE_SHIPPING_THRESHOLD * 5)).toBe(shippingOption('express').price);
  });

  it('falls back to standard for an unknown delivery id', () => {
    expect(shippingOption('teleport').id).toBe('standard');
  });

  it('reports the remaining amount to free delivery and never goes negative', () => {
    expect(amountToFreeShipping(9000)).toBe(FREE_SHIPPING_THRESHOLD - 9000);
    expect(amountToFreeShipping(FREE_SHIPPING_THRESHOLD + 500)).toBe(0);
  });
});

describe('computeTotals', () => {
  it('sums whole-PKR line totals, adds delivery and calculates no tax', () => {
    const totals = computeTotals([{ lineTotal: 8490 }, { lineTotal: 16900 }], 'standard');
    expect(totals).toEqual({ subtotal: 25390, shipping: 0, tax: 0, total: 25390 });
  });

  it('adds the delivery charge below the threshold', () => {
    const totals = computeTotals([{ lineTotal: 5000 }], 'standard');
    expect(totals.shipping).toBe(shippingOption('standard').price);
    expect(totals.total).toBe(5000 + totals.shipping);
  });

  it('returns zeros for no lines', () => {
    expect(computeTotals([], 'express')).toEqual({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
  });
});
