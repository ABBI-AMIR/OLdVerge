import {describe, expect, it} from 'vitest';
import manifest from './productImageVariants.json';
import {responsiveImageProps} from './responsiveImages.js';

describe('responsive owner photos', () => {
  const [original, image] = Object.entries(manifest)[0];
  it('keeps an unfamiliar or replaced stored cover unchanged', () => {
    expect(responsiveImageProps('https://storage.test/new-cover.png', 'not-approved')).toEqual({src:'https://storage.test/new-cover.png'});
  });
  it('uses responsive copies for the exact photo, including a checksum-verified stored cover', () => {
    const props = responsiveImageProps(original);
    expect(props.srcSet).toContain('480w');
    expect(props.src).toBe(image.variants.at(-1).src);
    expect(responsiveImageProps('https://storage.test/cover.png', image.checksum)).toEqual(props);
    expect(responsiveImageProps(props.src)).toEqual(props);
  });
});
