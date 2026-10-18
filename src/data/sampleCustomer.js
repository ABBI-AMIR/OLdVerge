// Sample data for the demo account screens. None of this is a real customer or order.
export const SAMPLE_CUSTOMER = {
  name: 'Sample Customer',
  email: 'sample.customer@example.com',
  phone: '0300 0000000',
};

export const SAMPLE_ADDRESSES = [
  { id: 'addr-1', label: 'Home', name: 'Sample Customer', line1: '12 Sample Street', line2: '', city: 'Lahore', province: 'Punjab', postalCode: '54000', phone: '0300 0000000', isDefault: true },
];

// Orders reference real catalogue slugs, so names, options and prices always match the shop.
export const SAMPLE_ORDERS = [
  {
    id: 'OV-DEMO-1001', placedAt: '2026-09-12T10:30:00.000Z', status: 'Delivered (sample)', shippingId: 'standard', sample: true,
    items: [{ slug: 'quarter-zip-navy', size: 'M', color: 'Navy', quantity: 1 }],
  },
  {
    id: 'OV-DEMO-1002', placedAt: '2026-10-02T15:05:00.000Z', status: 'In transit (sample)', shippingId: 'express', sample: true,
    items: [{ slug: 'casio-a168', size: 'One size', color: 'Silver', quantity: 1 }, { slug: 'quarter-zip-black', size: 'L', color: 'Black', quantity: 2 }],
  },
];
