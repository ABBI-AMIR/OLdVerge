import { uploadedProductData } from './uploadedProductData.js';
import { registerImageSize } from './imageSizes.js';

// Owner-supplied photos and folder labels. Prices and technical specifications
// await owner confirmation. This local catalogue never publishes database rows.
export const uploadedProducts = uploadedProductData.map(entry => {
  const { photos, color, ...details } = entry;
  const images = photos.map(([file, width, height], index) => {
    // Preserve URI path punctuation such as commas: the static server uses
    // decodeURI, which intentionally leaves escaped reserved punctuation alone.
    const src = encodeURI(file);
    registerImageSize(src, width, height);
    return { src, width, height, alt: `${entry.name}, ${index === 0 ? 'main view' : `additional view ${index}`}` };
  });
  return {
    ...details, id: entry.slug, colors: [color], images,
    image: images[0].src, photo: images[0].src,
    price: null, pricePending: true, ownerUpload: true,
    sizes: entry.type === 'watch' ? ['One size'] : ['S', 'M', 'L', 'XL', 'XXL'],
    material: 'Composition and specifications to be confirmed', badge: '',
    listingStatus: 'Price, specifications, sizes and availability await owner confirmation.',
  };
});
