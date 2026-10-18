// Intrinsic pixel sizes of the photos in /public/images, so <img> elements can
// reserve their space before loading. Add an entry when a photo is added.
export const IMAGE_SIZES = {
  '/images/oldverge-hero-model.jpg': [1200, 1500],
  '/images/oldverge-hero-watch-detail.jpg': [1200, 800],
  '/images/oldverge-watch-editorial.jpg': [1200, 675],
  '/images/quarter-zip-beige.jpg': [1200, 1500],
  '/images/quarter-zip-black.jpg': [1200, 1800],
  '/images/quarter-zip-navy.jpg': [1200, 1801],
  '/images/quarter-zip-neutral.jpg': [1200, 1800],
  '/images/quarter-zip-olive.jpg': [1200, 1800],
  '/images/quarter-zip-soft-knit.jpg': [1200, 1749],
  '/images/watch-casio-a168.jpg': [1200, 1200],
  '/images/watch-casio-mtp.jpg': [1200, 792],
  '/images/watch-citizen-eco.jpg': [1200, 800],
  '/images/watch-hero-wrist.jpg': [1200, 800],
  '/images/watch-orient-bambino.jpg': [1200, 1698],
  '/images/watch-seiko-sports.jpg': [1200, 1800],
  '/images/watch-timex-weekender.jpg': [1200, 1600],
  // Background-removed cut-outs (4:5) that sit on the beige product tile.
  '/images/watch-casio-a168-cutout.webp': [960, 1200],
  '/images/watch-casio-mtp-cutout.webp': [960, 1200],
  '/images/watch-timex-weekender-cutout.webp': [960, 1200],
  '/images/watch-seiko-sports-cutout.webp': [960, 1200],
  '/images/watch-citizen-eco-cutout.webp': [960, 1200],
  '/images/watch-orient-bambino-cutout.webp': [960, 1200],
  '/images/quarter-zip-black-cutout.webp': [960, 1200],
  '/images/quarter-zip-beige-cutout.webp': [960, 1200],
  '/images/quarter-zip-navy-cutout.webp': [960, 1200],
  '/images/quarter-zip-olive-cutout.webp': [960, 1200],
  '/images/quarter-zip-soft-knit-cutout.webp': [960, 1200],
};

export const imageSize = (src) => {
  const size = IMAGE_SIZES[src];
  return size ? { width: size[0], height: size[1] } : {};
};
