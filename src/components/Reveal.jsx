import { createElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// motion.create() must not run during render for the same tag twice, so each tag is created once.
const motionTags = new Map();
const motionFor = (tag) => {
  if (typeof tag !== 'string') return tag;
  if (!motionTags.has(tag)) motionTags.set(tag, motion.create(tag));
  return motionTags.get(tag);
};

/**
 * One-time entrance (framer-motion): a gentle fade and short rise when the block first scrolls into view.
 * Lenis only drives scrolling; it reads the same native scroll position, so whileInView works unchanged.
 * Renders a plain element (no animation at all) when the visitor prefers reduced motion.
 */
export default function Reveal({ as = 'div', delay = 0, y = 24, duration = 0.7, className, style, children, ...rest }) {
  const reduced = useReducedMotion();
  if (reduced) return createElement(as, { className, style, ...rest }, children);
  const Component = motionFor(as);
  return (
    <Component
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -6% 0px' }}
      transition={{ duration, delay, ease: [0.22, 0.7, 0.2, 1] }}
      {...rest}
    >
      {children}
    </Component>
  );
}
