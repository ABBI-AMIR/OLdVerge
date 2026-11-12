// Gallery images for a product: the background-removed cut-out first, then the original photograph.
export const originalPhoto = (src) => (src ? src.replace(/-cutout\.webp$/, '.jpg') : src);

export function productImageFiles(category, slug) {
  if (![category, slug].every(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new Error('Product image folders must use lowercase kebab-case.');
  const directory = `/images/products/${category}/${slug}`;
  return Object.fromEntries(['front', 'back', 'detail-1', 'detail-2'].map(view => [view, `${directory}/${view}.jpg`]));
}

// An incomplete manual upload must not replace a working photo with a broken URL.
// No backend product is changed: only local catalogue entries have imageFiles.
export function resolveUploadedImages(product, available) {
  if (!product.imageFiles || !available.has(product.imageFiles.front)) return product;
  const labels = {front: 'front view', back: 'back view', 'detail-1': 'detail 1', 'detail-2': 'detail 2'};
  const images = Object.entries(product.imageFiles).filter(([, src]) => available.has(src))
    .map(([view, src]) => ({src, alt: `${product.name}, ${labels[view]}`}));
  return {...product, image: product.imageFiles.front, photo: product.imageFiles.front, images,
    hoverImage: available.has(product.imageFiles.back) ? product.imageFiles.back : undefined};
}

export function galleryFor(product) {
  // Backend products carry their approved images (cover first); demo products derive the original photo from the cut-out.
  if (Array.isArray(product.images)) return product.images.map((image) => ({ src: image.src, alt: image.alt || `${product.name}, product view` }));
  if (!product.image) return [];
  const original = originalPhoto(product.image);
  const images = [{ src: product.image, alt: `${product.name}, product view` }];
  if (original !== product.image) images.push({ src: original, alt: `${product.name}, original photograph` });
  return images;
}
