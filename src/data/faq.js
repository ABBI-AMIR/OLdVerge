import { watchBrandOptions } from './collections.js';

// An answer is a list of segments: plain strings or { to, text } links.
// Only statements the project can support. Shipping and returns have no confirmed business
// information yet, so those answers say plainly what is not decided and point to the pages that
// will carry the real terms (recorded in docs/project-handover.md). Product care is not covered.
export function faqGroups() {
  const brands = watchBrandOptions().filter((brand) => brand.count > 0).map((brand) => brand.name);
  const list = brands.length > 1 ? `${brands.slice(0, -1).join(', ')} and ${brands[brands.length - 1]}` : brands[0] || '';
  return [
    {
      id: 'products',
      title: 'Products & Sizing',
      items: [
        { id: 'sells', q: 'What does OLDVERGE sell?', a: ['Quarter zips and watches. Browse ', { to: '/shop/quarter-zips', text: 'Quarter Zips' }, ' or ', { to: '/shop/watches', text: 'Watches' }, '.'] },
        { id: 'colours', q: 'Which colours do the quarter zips come in?', a: ['Black, beige, navy and olive.'] },
        { id: 'sizing', q: 'Which sizes are available?', a: ['Quarter zips are listed in S, M, L, XL and XXL. Garment measurements have not been published yet, so a size guide is not available.'] },
        { id: 'brands', q: 'Which watch brands are listed?', a: [`${list}.`] },
      ],
    },
    {
      id: 'orders',
      title: 'Orders & Payments',
      items: [
        { id: 'order', q: 'Can I place an order?', a: ['Not yet. This is a demo storefront: you can go through checkout, but no real order is created. Your cart stays in this browser.'] },
        { id: 'payment', q: 'Which payment methods are accepted?', a: ['None are set up yet. The demo checkout has a clearly labelled demo payment option, collects no card details and takes no payment.'] },
        { id: 'prices', q: 'Are the prices final?', a: ['No. Displayed prices are samples and may change before ordering opens.'] },
        { id: 'cart', q: 'What happens to the items in my bag?', a: ['They are kept in this browser only, so they are still there when you come back on the same device. Nothing is sent to OLDVERGE.'] },
      ],
    },
    {
      id: 'delivery',
      title: 'Shipping & Delivery',
      items: [
        { id: 'delivery-where', q: 'Where do you deliver?', a: ['Delivery areas have not been confirmed yet. The checkout accepts addresses in Pakistan only. See ', { to: '/pages/shipping', text: 'Shipping & delivery' }, '.'] },
        { id: 'delivery-cost', q: 'How much does delivery cost, and how long does it take?', a: ['The charges and times in the checkout are sample values, not final terms. The real ones will be published before the first order is accepted.'] },
        { id: 'tracking', q: 'How will I track an order?', a: ['Each order will have an order number that you can enter on the ', { to: '/pages/track-order', text: 'Track an order' }, ' page. For now that page shows a sample result only.'] },
      ],
    },
    {
      id: 'returns',
      title: 'Returns & Exchanges',
      items: [
        { id: 'returns-policy', q: 'What is the returns policy?', a: ['It has not been confirmed yet, because no orders are being taken. The terms will be published on the ', { to: '/refund-policy', text: 'Returns & Refunds' }, ' page before ordering opens.'] },
        { id: 'returns-how', q: 'How will I request a return or an exchange?', a: ['Through the ', { to: '/pages/returns', text: 'Returns & exchanges' }, ' page, using your order number and email address. The form there is a preview and sends nothing yet.'] },
      ],
    },
    {
      id: 'help',
      title: 'Contact',
      items: [
        { id: 'contact', q: 'How can I ask something that is not answered here?', a: ['Use the form on the ', { to: '/contact', text: 'Contact' }, ' page. Contact details such as an email address or phone number will be shown there once OLDVERGE publishes them.'] },
      ],
    },
  ];
}
