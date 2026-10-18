import { quarterZip, watch } from './productBuilders.js';
import { demoListings } from './demoListings.js';

export const products = [
  watch('casio-a168', 'Casio', 'Vintage A168', 16900, 'Silver', '/images/watch-casio-a168-cutout.webp', 'A retro digital watch with a stainless-steel bracelet and a clear digital display.', 'Digital'),
  watch('casio-mtp', 'Casio', 'MTP-1302', 24900, 'Blue', '/images/watch-casio-mtp-cutout.webp', 'A classic everyday analog watch.', 'Dress'),
  watch('timex-weekender', 'Timex', 'Weekender', 28900, 'Black', '/images/watch-timex-weekender-cutout.webp', 'A versatile field-inspired watch with an easy-to-read dial.', 'Field'),
  watch('seiko-5', 'Seiko', '5 Sports', 74900, 'Black', '/images/watch-seiko-sports-cutout.webp', 'A sport-forward automatic watch.', 'Sport'),
  watch('citizen-eco-drive', 'Citizen', 'Eco-Drive', 89900, 'Blue', '/images/watch-citizen-eco-cutout.webp', 'A clean, everyday watch.', 'Everyday'),
  watch('orient-bambino', 'Orient', 'Bambino', 109000, 'Cream', '/images/watch-orient-bambino-cutout.webp', 'A refined dress watch.', 'Dress'),
  quarterZip('quarter-zip-black', 'Black', '/images/quarter-zip-black-cutout.webp', '#262622'),
  quarterZip('quarter-zip-beige', 'Beige', '/images/quarter-zip-beige-cutout.webp', '#C7B99F'),
  quarterZip('quarter-zip-navy', 'Navy', '/images/quarter-zip-navy-cutout.webp', '#273447'),
  quarterZip('quarter-zip-olive', 'Olive', '/images/quarter-zip-olive-cutout.webp', '#656A4B'),
  ...demoListings,
];

export const productBySlug = (slug) => products.find((product) => product.slug === slug);
