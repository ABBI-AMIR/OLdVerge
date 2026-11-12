import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { products } from './products.js';
import { galleryFor, productImageFiles, resolveUploadedImages } from './productImages.js';
import ProductArt from '../components/ProductArt.jsx';

describe('manual product image uploads', () => {
  it('provides canonical front paths for legacy sample catalogue entries', () => {
    expect(products).toHaveLength(10);
    for (const product of products) {
      const category = product.type === 'watch' ? 'watches' : 'quarter-zips';
      expect(product.imageFiles.front).toBe(`/images/products/${category}/${product.slug}/front.jpg`);
    }
  });
  it('rejects unsafe folder names', () => {
    for (const slug of ['../navy', 'Navy', 'navy blue', '/navy']) expect(() => productImageFiles('quarter-zips', slug)).toThrow();
  });
  it('preserves existing photos until the required front is uploaded', () => {
    const product = products[0];
    expect(resolveUploadedImages(product, new Set([product.imageFiles.back]))).toBe(product);
    expect(galleryFor(product)).toHaveLength(2);
  });
  it('selects the uploaded front for cards and carousel and orders only present gallery views', () => {
    const product = products[0];
    const resolved = resolveUploadedImages(product, new Set([product.imageFiles['detail-2'], product.imageFiles.front, product.imageFiles.back]));
    expect(resolved.image).toBe(product.imageFiles.front);
    expect(resolved.photo).toBe(product.imageFiles.front);
    expect(resolved.hoverImage).toBe(product.imageFiles.back);
    expect(galleryFor(resolved)).toEqual([
      {src: product.imageFiles.front, alt: `${product.name}, front view`},
      {src: product.imageFiles.back, alt: `${product.name}, back view`},
      {src: product.imageFiles['detail-2'], alt: `${product.name}, detail 2`},
    ]);
  });
  it('supports a front-only upload without inventing optional photos', () => {
    const product = products[6];
    const resolved = resolveUploadedImages(product, new Set([product.imageFiles.front]));
    expect(resolved.images).toHaveLength(1);
    expect(resolved.hoverImage).toBeUndefined();
  });
  it('preserves approved backend images and generates missing alt text from the product name', () => {
    const product = {name: 'Backend Watch', image: 'https://storage.example/approved.webp', images: [{src: 'https://storage.example/approved.webp', alt: ''}]};
    expect(resolveUploadedImages(product, new Set())).toBe(product);
    expect(galleryFor(product)[0].alt).toBe('Backend Watch, product view');
  });
  it('lazy-loads card photos with name-based alt text while large photos remain eager', () => {
    expect(renderToStaticMarkup(<ProductArt product={products[0]} />)).toContain('loading="lazy"');
    expect(renderToStaticMarkup(<ProductArt product={products[0]} />)).toContain(`alt="${products[0].name}"`);
    expect(renderToStaticMarkup(<ProductArt product={products[0]} large />)).toContain('loading="eager"');
  });
});
