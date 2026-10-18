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
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  material: 'Fabric composition to be confirmed',
  image,
  artColor,
  style: 'Everyday',
  badge: '',
  description: `The OLDVERGE quarter-zip in ${color.toLowerCase()}. A considered layer for cool mornings, late evenings, and everything between.`,
  listingStatus: 'Sample listing — confirm final price, fabric composition, size measurements and stock before purchase.',
});
