import { uploadedProductData } from '../data/uploadedProductData.js';
import { responsiveImageProps } from '../data/responsiveImages.js';

export const RETURN_TO_IDLE_MS = 300;

// Presentation assets are separate from a mutable catalogue/CDN cover URL.
// The existing turntable was made from these owner studio photographs.
const studioFronts = new Map(uploadedProductData.filter(product => product.category === 'Quarter-Zips')
  .map(product => [product.slug, product.photos[0]]));

// The catalogue supplies names, swatches and approved image paths together.
export const quarterZipColors = products => products
  .filter(product => product.category === 'Quarter-Zips' && product.image)
  .map(product => {
    const studio = studioFronts.get(product.slug);
    const imageProps = responsiveImageProps(studio?.[0] || product.image);
    return {slug: product.slug, name: product.colors[0], hex: product.artColor || '#8A8175',
      image: imageProps.src, imageProps, studioFront: Boolean(studio),
      turntable: Boolean(studio && product.slug === 'quarter-zip-burgundy'),
      ...(studio ? {width: studio[1], height: studio[2]} : {})};
  });

export function colorNames(colors) {
  const names = colors.map(color => color.name.toLowerCase());
  if (names.length < 2) return names[0] || '';
  if (names.length === 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

export function colorWays(count) {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  return `${words[count] || count} ${count === 1 ? 'way' : 'ways'}.`;
}

export const idleShowcase = {hovered: null, focused: null, selected: null, held: null};
export const shownColor = state => state.hovered ?? state.focused ?? state.held ?? state.selected;

export function showcaseReducer(state, action) {
  switch (action.type) {
    case 'hover': return {...state, hovered: action.slug, focused: null, held: null};
    case 'leave': return {...state, hovered: null, held: state.hovered};
    case 'expire': return {...state, held: null};
    case 'focus': return {...state, focused: action.slug, hovered: null, held: null};
    case 'blur': return {...state, focused: null};
    case 'tap': return {...idleShowcase, selected: state.selected === action.slug ? null : action.slug};
    case 'reset': return idleShowcase;
    default: return state;
  }
}

export function showcaseTilt(x, y, single = false) {
  const limit = single ? 7 : 4;
  const clamp = value => Math.min(1, Math.max(-1, value));
  return {x: -clamp(y) * limit, y: clamp(x) * limit};
}
