// Demo listings for the requested watch brands: Rolex, Patek Philippe,
// Cartier, Franck Muller and Best Win.
//
// STATUS: intentionally empty. No supplied or permitted photograph of any of
// these brands exists in the project, and no model references or prices have
// been provided. Those brand collections therefore show an honest empty state.
// Do NOT fill this array with another brand's photo, a stock "luxury watch"
// photo, or invented references/prices.
//
// To add a listing once real material exists:
//   1. Put the photo in /public/images/ and record its source and licence in
//      docs/project-handover.md (section "Image sources").
//   2. Append an entry built with the shared constructor, for example:
//        import { watch } from './productBuilders.js';
//        watch('rolex-<reference>', 'Rolex', '<exact model name>', <PKR price>,
//          '<dial colour>', '/images/<file>.jpg', '<accurate description>', '<style>'),
//   3. The brand's collection, the Filter drawer counts, the product page and the
//      cart pick it up automatically. The brand id in the URL is the slugified
//      brand name (for example "Patek Philippe" -> patek-philippe).
//
// Entries here are appended to the catalogue in products.js.
export const demoListings = [];
