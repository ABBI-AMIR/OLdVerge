import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ColorExplorer from './ColorExplorer.jsx';
import { uploadedProducts } from '../data/uploadedProducts.js';
import { colorNames, colorWays, idleShowcase, quarterZipColors, RETURN_TO_IDLE_MS, showcaseReducer, showcaseTilt, shownColor } from '../lib/quarterZipShowcase.js';

const colors = quarterZipColors(uploadedProducts);
const reduce = (state, type, slug) => showcaseReducer(state, {type, slug});

describe('quarter-zip showcase', () => {
  it('drives labels, copy, swatches and photos from the current catalogue', () => {
    expect(colors.map(color => color.name)).toEqual(['Black', 'Brown', 'Navy', 'Burgundy']);
    expect(colorNames(colors)).toBe('black, brown, navy, and burgundy');
    expect(colorWays(colors.length)).toBe('Four ways.');
    expect(colorWays(1)).toBe('One way.');
    const extended = [...colors, {slug: 'new', name: 'Stone', hex: '#ccc', image: '/new.jpg'}];
    expect(colorWays(extended.length)).toBe('Five ways.');
    expect(colorNames(extended)).toContain('and stone');
    expect(colors.every(color => color.image && color.hex)).toBe(true);
    expect(quarterZipColors([{category:'Quarter-Zips',image:null}])).toEqual([]);
  });
  it('keeps hover visible during the 300ms departure grace period, then returns to idle', () => {
    let state = reduce(idleShowcase, 'hover', 'navy');
    expect(shownColor(state)).toBe('navy');
    state = reduce(state, 'leave');
    expect(RETURN_TO_IDLE_MS).toBe(300);
    expect(shownColor(state)).toBe('navy');
    expect(shownColor(reduce(state, 'expire'))).toBeNull();
    expect(shownColor(reduce(state, 'hover', 'black'))).toBe('black');
  });
  it('keeps owner studio photos and the idle turntable when catalogue covers use CDN or optimized URLs', () => {
    const hosted = uploadedProducts.map(product => ({...product, image: `https://example.supabase.co/storage/v1/object/public/product-public/${product.slug}.webp`}));
    const studio = quarterZipColors(hosted);
    expect(studio.map(color => color.image)).toEqual(colors.map(color => color.image));
    expect(studio.every(color => color.studioFront && color.imageProps.srcSet)).toBe(true);
    expect(studio.filter(color => color.turntable).map(color => color.slug)).toEqual(['quarter-zip-burgundy']);
    const html=renderToStaticMarkup(<MemoryRouter><ColorExplorer colors={studio}/></MemoryRouter>);
    expect(html).toContain('class="ov-cx-turn"');
    expect(html).toContain('data-matte="true"');
    expect(html).not.toContain('example.supabase.co');
    expect(html).toContain('srcSet=');
  });
  it('previews keyboard focus and clears it on blur without pinning a mouse selection', () => {
    const state = reduce(idleShowcase, 'focus', 'burgundy');
    expect(shownColor(state)).toBe('burgundy');
    expect(state.selected).toBeNull();
    expect(shownColor(reduce(state, 'blur'))).toBeNull();
  });
  it('gives a new keyboard or pointer interaction priority over a stale preview', () => {
    let state=reduce(idleShowcase,'hover','navy');
    state=reduce(state,'focus','burgundy');
    expect(shownColor(state)).toBe('burgundy');
    state=reduce(state,'hover','black');
    expect(shownColor(state)).toBe('black');
  });
  it('toggles mobile selections, switches colours and clears on outside interaction or Escape', () => {
    let state = reduce(idleShowcase, 'tap', 'navy');
    expect(shownColor(state)).toBe('navy');
    expect(shownColor(reduce(state, 'tap', 'navy'))).toBeNull();
    state = reduce(state, 'tap', 'black');
    expect(shownColor(state)).toBe('black');
    expect(reduce(state, 'reset')).toEqual(idleShowcase);
  });
  it('clamps cursor tilt to four degrees for the stack and seven for a single image', () => {
    expect(showcaseTilt(10, -10)).toEqual({x:4,y:4});
    expect(showcaseTilt(-10, 10, true)).toEqual({x:-7,y:-7});
    expect(showcaseTilt(0.5, 0.5, true)).toEqual({x:-3.5,y:3.5});
  });
  it('SSR renders every idle photo, eager single images, accessible controls and accurate copy', () => {
    const html=renderToStaticMarkup(<MemoryRouter><ColorExplorer colors={colors} /></MemoryRouter>);
    expect(html).toContain('Four ways.');
    expect(html).toContain('black, brown, navy, and burgundy');
    expect(html).not.toContain('beige, navy, and olive');
    for(const color of colors) {
      expect(html).toContain(`alt="Oldverge quarter-zip in ${color.name}"`);
      expect(html).toContain(`aria-label="Shop Oldverge quarter-zip in ${color.name}"`);
      expect(html).toContain(`href="/product/${color.slug}"`);
    }
    expect((html.match(/loading="eager"/g)||[])).toHaveLength(colors.length*2);
    expect(html).not.toContain('loading="lazy"');
    expect(html).toContain('Showing all 4 quarter-zip colours');
    expect(html).toContain('Show all colours');
    expect(html).toContain('ov-cx-garment lead');
    expect(html).toContain('ov-cx-garment partner');
    expect((html.match(/ov-cx-garment waiting/g) || [])).toHaveLength(2);
    expect(html).toContain('Pause quarter-zip animation');
  });
});
