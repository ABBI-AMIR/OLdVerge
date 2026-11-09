import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { products } from './localProductImages.js';
import { uploadedProducts } from './uploadedProducts.js';
import { galleryFor } from './productImages.js';
import { copyFor } from './productCopy.js';
import { imageSize } from './imageSizes.js';
import { DEMO_FEATURED, pickFeatured } from './featured.js';
import { formatPrice } from '../lib/money.js';
import { applyFilters, emptyFilters, sortProducts } from '../lib/collectionFilters.js';
import { useCatalog } from './catalog.js';
import { useStore, resolveLines, sanitizeLines, reconcileLines, validateOptions } from '../store.js';
import ProductArt from '../components/ProductArt.jsx';

describe('owner uploaded catalogue', () => {
  it('shows all 19 watches and four uploaded quarter-zips instead of unrelated samples', () => {
    expect(products).toBe(uploadedProducts);
    expect(products.filter(p => p.category === 'Watches')).toHaveLength(19);
    expect(products.filter(p => p.category === 'Quarter-Zips')).toHaveLength(4);
    expect(new Set(products.map(p => p.slug)).size).toBe(23);
    expect(products.some(p => p.slug === 'casio-a168')).toBe(false);
    expect(products.filter(p => p.type === 'clothing').map(p => p.colors[0])).toEqual(['Black','Chocolate Brown','Navy','Burgundy']);
  });
  it('maps every uploaded product folder and every gallery image to an existing browser-compatible file', () => {
    const mappedFolders = new Set();
    const mappedFiles = new Set();
    for (const product of products) {
      expect(product.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(product.image).toBe(product.images[0].src);
      expect(copyFor(product).join(' ')).toBe(product.description);
      expect(product.description.length).toBeGreaterThan(70);
      for (const image of galleryFor(product)) {
        const file = `public${decodeURIComponent(image.src)}`;
        expect(existsSync(file),file).toBe(true);
        expect(image.src).toMatch(/\.(png|jpg)$/);
        expect(image.src).not.toContain('%2C');
        expect(image.alt).toContain(product.name);
        expect(imageSize(image.src).width).toBeGreaterThan(0);
        mappedFolders.add(file.slice(0,file.lastIndexOf('/')));
        mappedFiles.add(file);
      }
    }
    const walk = dir => readdirSync(dir,{withFileTypes:true}).forEach(item => {
      if(item.isDirectory())walk(`${dir}/${item.name}`);
      else if(/\.(png|heic)$/i.test(item.name)) {
        expect(mappedFolders.has(dir),dir).toBe(true);
        if(/\.png$/i.test(item.name))expect(mappedFiles.has(`${dir}/${item.name}`),item.name).toBe(true);
      }
    });
    walk('public/images/products');
  });
  it('uses the dial-facing photo rather than the shared bracelet photo as cover', () => {
    for(const [slug,file] of [['tissot-prx-green','IMG_1399_beige.png'],['tissot-prx-ice-blue','IMG_1398_beige.png'],['omega-seamaster-planet-ocean-white','IMG_1371_beige.png'],['rolex-datejust-green','IMG_1247_beige.png'],['rolex-datejust-navy','IMG_1249_beige.png'],['rolex-explorer-ii-polar','rrrr_beige.png']]) {
      expect(products.find(p => p.slug === slug).image).toContain(file);
    }
    expect(products.find(p => p.slug === 'rolex-black-dial-model-pending').description).toContain('exact model needs confirmation');
  });
  it('features uploaded photos and renders lazy cards with dimensions and name-based alt text', () => {
    expect(pickFeatured(products,DEMO_FEATURED)).toHaveLength(10);
    for(const product of products) {
      const html=renderToStaticMarkup(<ProductArt product={product} />);
      expect(html).toContain('loading="lazy"');
      expect(html).toContain(`alt="${product.name}"`);
      expect(html).toContain('width=');
    }
  });
  it('does not invent prices or allow pending-price products through cart or direct checkout', () => {
    const previous=useCatalog.getState().products;
    const previousCart=useStore.getState().cart;
    const previousDirect=useStore.getState().directItem;
    useCatalog.setState({products});
    try {
      for(const product of products) {
        expect(product.price).toBeNull();
        expect(formatPrice(product.price)).toBe('Price to be confirmed');
        const options={size:product.sizes[0],color:product.colors[0],quantity:1};
        expect(validateOptions(product,options)).toContain('price has not been confirmed');
        expect(useStore.getState().addToCart(product,options).ok).toBe(false);
        expect(useStore.getState().buyNowProduct(product,options).ok).toBe(false);
        const lines=[{productId:product.id,...options}];
        expect(sanitizeLines(lines)).toEqual([]);
        expect(reconcileLines(lines).kept).toEqual([]);
        expect(resolveLines(lines)).toEqual([]);
      }
    } finally {useCatalog.setState({products:previous});useStore.setState({cart:previousCart,directItem:previousDirect});}
  });
  it('keeps unknown prices out of price ranges and sorts them after confirmed prices', () => {
    const items=[products[0],{...products[1],price:100},{...products[2],price:200}];
    expect(sortProducts(items,'price-asc').map(p=>p.price)).toEqual([100,200,null]);
    expect(sortProducts(items,'price-desc').map(p=>p.price)).toEqual([200,100,null]);
    expect(applyFilters(products,{...emptyFilters(),priceMax:5000})).toEqual([]);
    expect(formatPrice(0)).toBe('PKR 0');
  });
});
