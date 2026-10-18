// All amounts are whole PKR (integers), so sums never pick up floating-point error.
export const formatPrice = (price) => `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(price)}`;

export const MAX_QTY = 9;

// Demo delivery rules, used by the cart drawer, the cart, the checkout and the confirmation.
// They are sample values, not real delivery terms.
export const FREE_SHIPPING_THRESHOLD = 10000;
export const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard delivery', price: 250, estimate: 'Illustrative estimate: 3 to 5 working days' },
  { id: 'express', label: 'Express delivery', price: 600, estimate: 'Illustrative estimate: 1 to 2 working days' },
];
export const shippingOption = (id) => SHIPPING_OPTIONS.find((option) => option.id === id) || SHIPPING_OPTIONS[0];

export const shippingCost = (id, subtotal) => {
  if (subtotal <= 0) return 0;
  const option = shippingOption(id);
  return option.id === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : option.price;
};

/** lines: [{ lineTotal }] from resolveLines(). Taxes are not calculated in this demo. */
export const computeTotals = (lines, shippingId = 'standard') => {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = shippingCost(shippingId, subtotal);
  const tax = 0;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
};

export const amountToFreeShipping = (subtotal) => Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
