import { products as catalogue } from './products.js';
import { resolveUploadedImages } from './productImages.js';
import { uploadedProducts } from './uploadedProducts.js';

// Only discover filenames; never fetch optional views or alter image bytes.
// Vite refreshes this list in dev and captures it during a production rebuild.
const available = new Set(Object.keys(import.meta.glob('/public/images/products/*/*/*.jpg', {query: '?url', import: 'default'}))
  .map(file => file.replace(/^\/public/, '')));
// Retain legacy sample data for historical seeds; display the owner's uploads
// instead of mixing unrelated sample photos into the current collection.
export const products = uploadedProducts.length ? uploadedProducts : catalogue.map(product => resolveUploadedImages(product, available));
