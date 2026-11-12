import { QUARTER_ZIP_SIZES } from './quarterZipSizes.js';
import { productImageFiles } from './productImages.js';
// Shared constructors for catalogue entries. Kept apart from products.js so
// demoListings.js can build entries without a circular import.

export const watch = (id, brand, model, price, color, image, description, style) => ({
  id,
  slug: id,
  name: `${brand} ${model}`,
  brand,
  model,
  category: 'Watches',
  type: 'watch',
  price,
  colors: [color],
  sizes: ['One size'],
  material: 'See manufacturer specifications',
  image,
  imageFiles: productImageFiles('watches', id),
  style,
  badge: '',
  description,
  listingStatus: 'Sample listing — confirm stock, model, PKR price and authenticity documentation before purchase.',
});

export const quarterZip = (id, color, image, artColor) => ({
  id,
  slug: id,
  name: `Essential Quarter-Zip — ${color}`,
  brand: 'OLDVERGE',
  category: 'Quarter-Zips',
  type: 'clothing',
  price: 8490,
  colors: [color],
  sizes: QUARTER_ZIP_SIZES,
  material: 'Fabric composition to be confirmed',
  image,
  imageFiles: productImageFiles('quarter-zips', id),
  artColor,
  style: 'Everyday',
  badge: '',
  description: `A clean stand collar and a short zip in ${color.toLowerCase()}.`,
  listingStatus: 'Sample listing — confirm final price, fabric composition, size measurements and stock before purchase.',
});
