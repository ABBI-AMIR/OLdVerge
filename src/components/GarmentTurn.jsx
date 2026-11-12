import { useEffect, useRef } from 'react';

const SIZE = 432;
const BURGUNDY_ATLAS = '/images/products/quarter-zips/quarter-zip-burgundy/burgundy-turntable.webp';

function drawStudioTurn(ctx, atlas, turn) {
  const step = Math.round(turn * 64) % 64;
  const reverse = step > 32;
  const index = reverse ? 64 - step : step;
  const tile = atlas.naturalWidth / 6;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  if (reverse) { ctx.translate(SIZE, 0); ctx.scale(-1, 1); }
  ctx.drawImage(atlas, index % 6 * tile, Math.floor(index / 6) * tile, tile, tile, 0, 0, SIZE, SIZE);
  ctx.restore();
}

export default function GarmentTurn({ running }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!running) return;
    const canvas = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const atlas = new Image();
    const animation = canvas.parentElement.getAnimations().find(item => item.animationName === 'ov-cx-lead');
    let disposed = false, request = 0, lastStep = -1;
    const draw = () => {
      if (disposed || motion.matches) return;
      const phase = animation?.effect.getComputedTiming().progress ?? 0;
      const turn = Math.min(1, Math.max(0, (phase - .32) / .60));
      const step = Math.round(turn * 64);
      if (step !== lastStep) {
        drawStudioTurn(ctx, atlas, turn);
        canvas.dataset.ready = 'true';
        lastStep = step;
      }
      request = requestAnimationFrame(draw);
    };
    const play = () => {
      cancelAnimationFrame(request);
      if (!disposed && !motion.matches && atlas.naturalWidth) draw();
    };
    atlas.src = BURGUNDY_ATLAS;
    atlas.decode().then(play).catch(() => {}); // The original photo remains the fallback.
    motion.addEventListener('change', play);
    return () => {
      disposed = true;
      motion.removeEventListener('change', play);
      cancelAnimationFrame(request);
    };
  }, [running]);
  return <canvas className="ov-cx-turn" ref={ref} width={SIZE} height={SIZE} aria-hidden="true" />;
}
