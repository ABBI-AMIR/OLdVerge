import manifest from './productImageVariants.json';

const sources = new Map(Object.entries(manifest));
for (const image of Object.values(manifest)) {
  for (const variant of image.variants) sources.set(variant.src, image);
}
const checksums = new Map(Object.values(manifest).map(image => [image.checksum, image]));

// A stored cover uses local variants only when its recorded checksum matches
// the exact owner photo. New or changed admin uploads retain their stored URL.
export function responsiveImageProps(src, checksum) {
  const image = sources.get(src) || (checksum && checksums.get(checksum));
  if (!image) return {src};
  return {
    src: image.variants.at(-1).src,
    srcSet: image.variants.map(variant => `${variant.src} ${variant.width}w`).join(', '),
    sizes: '(max-width: 650px) 92vw, (max-width: 1000px) 45vw, 600px',
  };
}
