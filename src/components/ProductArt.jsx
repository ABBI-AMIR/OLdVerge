import { imageSize } from '../data/imageSizes.js';

const colors = {
  Olive: ['#AAB090', '#4E5941'], Silver: ['#F8FAFF', '#9FA8BB'], Stone: ['#D8D2C7', '#77736C'],
  Black: ['#54545A', '#18181D'],
};

export default function ProductArt({ product, large = false, style }) {
  const palette = colors[product.colors[0]] || colors.Stone;
  const handlePointerMove = (event) => {
    if (!large || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 8}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 8}deg`);
  };
  const resetTilt = (event) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
  };
  return (
    <div className={`product-art ${product.type === 'watch' ? 'is-watch' : 'is-clothing'} ${product.image ? 'is-photo' : ''} ${large ? 'art-large' : ''}`} style={{ '--art-a': palette[0], '--art-b': palette[1], ...style }} aria-label={`${product.name} product image`} role="img" onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
      {product.image && <img className="product-photo" src={product.image} alt={product.name} {...imageSize(product.image)} loading="eager" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
      {product.type === 'watch' ? (
        <div className="watch-object" aria-hidden="true">
          <div className="watch-strap" /><div className="watch-case"><div className="watch-face"><span className="watch-mark mark-top" /><span className="watch-mark mark-left" /><span className="watch-mark mark-right" /><span className="watch-mark mark-bottom" /><i className="watch-hand hand-hour" /><i className="watch-hand hand-minute" /><b className="watch-center" /></div></div>
        </div>
      ) : (
        <div className="garment" aria-hidden="true"><span className="garment-neck" /><span className="garment-seam" /><span className="garment-label">OV</span></div>
      )}
      <span className="art-grain" aria-hidden="true" />
    </div>
  );
}