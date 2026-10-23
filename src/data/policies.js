import { siteInfo } from './siteInfo.js';

// The four standard store policies. Each states only what is true of the site today.
// OLDVERGE has not supplied delivery, return or refund terms, so those two pages say so plainly and
// invent nothing. Replace their `sections` with the real terms when they are confirmed
// (see docs/project-handover.md, "Policy details still needed").
//
// Entry shape: { slug, aliases, title, description, updated, sections: [{ heading, body: [paragraphs] }] }
// Canonical paths: /shipping, /refund-policy, /privacy-policy, /terms-and-conditions.
const UPDATED = '2026-10-17';

const formSentence = siteInfo.contact.formEndpoint
  ? 'The contact form sends the first name, last name, email address, phone number, topics and message you type to the form service OLDVERGE has configured, so that your message can be answered.'
  : 'This website has no form that sends your details anywhere.';

export const POLICIES = [
  {
    slug: 'shipping',
    aliases: ['/shipping-policy'],
    title: 'Shipping Policy',
    description: 'Delivery information for OLDVERGE orders.',
    updated: UPDATED,
    sections: [
      { heading: 'Orders and delivery', body: ['OLDVERGE is not accepting orders yet, so nothing is being shipped.', 'Delivery areas, charges and delivery times will be published on this page before the first order is accepted.'] },
    ],
  },
  {
    slug: 'refund-policy',
    aliases: ['/returns', '/returns-and-refunds'],
    title: 'Returns & Refunds',
    description: 'Returns, exchanges and refunds at OLDVERGE.',
    updated: UPDATED,
    sections: [
      { heading: 'Returns, exchanges and refunds', body: ['OLDVERGE is not accepting orders yet, so there is nothing to return or refund.', 'The terms for returns, exchanges and refunds will be published on this page before the first order is accepted.'] },
    ],
  },
  {
    slug: 'privacy-policy',
    aliases: ['/privacy'],
    title: 'Privacy Policy',
    description: 'What the OLDVERGE website stores and which third parties it contacts.',
    updated: UPDATED,
    sections: [
      { heading: 'Stored in your browser', body: ['Your bag, the item you chose with Buy now and your recent searches are kept in this browser using localStorage. They stay on your device and are not sent to OLDVERGE or to anyone else.', 'Your browser’s sessionStorage also remembers whether the opening animation has played, where you were on a page when you went back, the last filters you used in the shop and, if you use the demonstration sign-in, the name, email address and phone number you typed there. It is cleared when you close the tab.', 'You can remove all of this at any time by clearing the site data for this website in your browser.'] },
      { heading: 'What this website does not do', body: ['It has no real customer accounts (the sign-in and account pages are a demonstration), no analytics or advertising trackers and no payment processing. Details typed into the demonstration checkout are held in memory until you reload or leave the site and are never sent or stored.', formSentence] },
      { heading: 'Third parties', body: ['The fonts are hosted with this website. Loading them does not make a request to Google Fonts.'] },
    ],
  },
  {
    slug: 'terms-and-conditions',
    aliases: ['/terms'],
    title: 'Terms & Conditions',
    description: 'Terms for using the OLDVERGE website.',
    updated: UPDATED,
    sections: [
      { heading: 'This website', body: ['The OLDVERGE website currently shows products. It does not take orders or payments.'] },
      { heading: 'Product information and prices', body: ['Descriptions, colours, photographs and prices are shown for information. Displayed prices are samples and may change before ordering opens.'] },
      { heading: 'Orders', body: ['Terms for placing an order, payment, delivery and returns will be published before ordering opens. See the Shipping Policy and Returns & Refunds pages.'] },
    ],
  },
];

export const policyPath = (policy) => `/${policy.slug}`;
