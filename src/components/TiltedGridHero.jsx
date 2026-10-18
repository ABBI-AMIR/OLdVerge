import * as React from 'react';

/*
 * TiltedGridHero — JSX adaptation of the supplied `tilted-grid-hero.tsx`.
 *
 * What changed from the supplied component, and nothing else:
 *   - TypeScript types removed (the project is plain JavaScript).
 *   - `cn` from "@/lib/utils" replaced by a two-line local join.
 *   - Tailwind utility classes replaced by the equivalent plain CSS in
 *     src/home.css (.tgh-root, .tgh-band, .tgh-tile, .tgh-strip, .tgh-img),
 *     so the component does not depend on shadcn or Tailwind theme tokens.
 *   - `bg-muted` -> --tgh-placeholder (OLDVERGE Sand); `rounded-lg` ends ->
 *     --tgh-radius (0: OLDVERGE uses square corners).
 *   - A `.tgh-tile` class on each tile so the page can hold the band still until the
 *     loader has left, and a `--tgh-duration` variable so home.css can pause the band
 *     under prefers-reduced-motion. (In the supplied code the inline `animation`
 *     shorthand overrides the class that was meant to pause it, and this site's
 *     global reduced-motion rule shortens every animation to 0.01ms, which would
 *     collapse the ribbon. home.css restores the duration and pauses it instead.)
 *   - FIX: the tiles are only rendered once the hero has been measured, and the whole set is
 *     re-keyed whenever the number of columns changes. In the supplied code each tile's place on
 *     the ribbon is its own running time (a negative `animation-delay` from the moment it was
 *     created). When a resize, a scrollbar appearing, or the first real measurement changed the
 *     column count, the tiles that already existed kept their clocks while the new ones started
 *     from zero, so the evenly spaced set fell out of step and left a tile-sized hole in the
 *     middle of the ribbon. Re-keying makes every tile in a set start together, so the spacing
 *     is correct from the first frame and stays correct after any resize.
 *   - `images[].position` (optional object-position) so each photo's subject stays in the crop;
 *     tile images use empty alt text because the whole band is aria-hidden decoration.
 *
 * The geometry (SLICES, CAMERA, arc(), measure(), the keyframes, the mask) is
 * the supplied code, unmodified.
 */

const cn = (...parts) => parts.filter(Boolean).join(' ');

// Strips per tile. Each is a few degrees of arc, too little to read as a facet.
const SLICES = 16;

// Camera distance from the screen, as a multiple of the cylinder's radius.
const CAMERA = 1.6;

/** Cylinder radius, as a share of the hero's width, that puts the frame's edge `bend` radians round the arc. */
function arc(bend) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
}

// A tile is never wider than this share of the hero, so a phone still shows its neighbours.
const MAX_WIDTH = 55;

function measure(width, height, tile, aspect, gap, bend) {
  const h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
  const deg = (rad) => (rad * 180) / Math.PI;
  const unit = deg(h / radius);
  const pitch = (aspect + gap / 100) * unit;
  const limit = deg(bend) + (aspect * unit) / 2;
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  const round = (n) => +n.toFixed(4);
  const sweep = round((columns * pitch) / 2);
  return { columns, sweep, unit: round(unit), limit: round(Math.min(sweep, limit)) };
}

export function TiltedGridHero({
  images,
  speed = 4,
  tileHeight = 26,
  aspectRatio = 16 / 9,
  gap = 6,
  axis = 56,
  curve = 80,
  fade = 12,
  children,
  className,
  style,
  ...props
}) {
  const ref = React.useRef(null);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const orbit = `tgh-o-${id}`;
  const tile = `tgh-t-${id}`;
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;

  // Null until the observer has measured the hero. The band stays hidden until then.
  const [layout, setLayout] = React.useState(null);
  // The image each tile shows, as a position in the run of images. Held with the column count it
  // belongs to, so a re-keyed set of tiles never inherits another set's picks.
  const [picked, setPicked] = React.useState({ columns: 0, map: {} });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = measure(width, height, tileHeight, aspectRatio, gap, bend);
      setLayout((prev) => (prev?.columns === next.columns && prev.sweep === next.sweep && prev.unit === next.unit ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tileHeight, aspectRatio, gap, bend]);

  // Fetch every image up front; a tile picks up its next one just before it comes into view.
  React.useEffect(() => {
    for (const { src } of images) new Image().src = src;
  }, [images]);

  const { columns, sweep, unit, limit } = layout ?? measure(1200, 560, tileHeight, aspectRatio, gap, bend);
  const shown = picked.columns === columns ? picked.map : {};

  const u = (n) => `calc(${+n.toFixed(4)} * min(${tileHeight}cqh, ${+(MAX_WIDTH / aspectRatio).toFixed(4)}cqw))`;

  const r = 100 * arc(bend);
  const radius = `${+r.toFixed(3)}cqw`;
  const turn = (deg) => `translateZ(${radius}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radius})`;

  const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
  const css =
    `@keyframes ${orbit}{` +
    `from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
    `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}` +
    `${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}` +
    `@media(prefers-reduced-motion:reduce){.${tile}{animation-play-state:paused}}`;

  const share = aspectRatio / SLICES;
  const duration = columns * speed;
  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${100 - fade}%,transparent)`;

  return (
    <div ref={ref} className={cn('tgh-root', className)} {...props} style={{ containerType: 'size', ...style }}>
      <style>{css}</style>

      <div
        aria-hidden
        className="tgh-band"
        style={{
          opacity: layout ? 1 : 0,
          perspective: `${+(r * CAMERA).toFixed(3)}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {layout && Array.from({ length: columns }, (_, t) => {
          const first = columns - 1 - t;
          const img = images[(shown[t] ?? first) % Math.max(images.length, 1)];
          return (
            <div
              key={`${columns}-${t}`}
              className={cn(tile, 'tgh-tile')}
              style={{
                left: `calc(50% - ${u(aspectRatio / 2)})`,
                top: `calc(${axis}% - ${u(0.5)})`,
                width: u(aspectRatio),
                height: u(1),
                transformStyle: 'preserve-3d',
                '--tgh-duration': `${duration}s`,
                animation: `${orbit} ${duration}s linear ${-t * speed}s infinite`,
              }}
              onAnimationIteration={(e) => {
                const lap = Math.round(e.elapsedTime / duration);
                setPicked((prev) => {
                  const next = lap * columns + first;
                  const map = prev.columns === columns ? prev.map : {};
                  return map[t] === next ? prev : { columns, map: { ...map, [t]: next } };
                });
              }}
            >
              {Array.from({ length: SLICES }, (_, k) => (
                <div
                  key={k}
                  className={cn('tgh-strip', k === 0 && 'tgh-strip-first', k === SLICES - 1 && 'tgh-strip-last')}
                  style={{
                    left: u((aspectRatio - share) / 2),
                    width: k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`,
                    height: u(1),
                    transform: turn((aspectRatio / 2 - (k + 0.5) * share) * unit),
                  }}
                >
                  {img ? (
                    <img
                      src={img.src}
                      alt=""
                      draggable={false}
                      className="tgh-img"
                      style={{ left: u(-k * share), width: u(aspectRatio), height: u(1), objectPosition: img.position || '50% 50%' }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}

export default TiltedGridHero;
