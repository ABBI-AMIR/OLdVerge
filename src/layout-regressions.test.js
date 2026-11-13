import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

describe('layout regressions', () => {
  it('does not hold a transform on the page wrapper after the entrance animation', () => {
    // A held end state (`both`/`forwards`) keeps a transform on .ov-page-enter, which traps
    // position:fixed overlays (product lightbox, filter drawer) inside the page and off screen.
    const rule = css('home.css').match(/\.ov-page-enter\s*\{[^}]*animation:\s*([^;]+);/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/\b(both|forwards)\b/);
  });

  it('keeps the two-column footer on phones after the desktop footer grid', () => {
    const source = css('store.css');
    const desktop = source.lastIndexOf('.ov-footer-cols { grid-template-columns: minmax(150px');
    const phone = source.lastIndexOf('@media (max-width: 640px) { .ov-footer-cols { grid-template-columns: repeat(2');
    expect(desktop).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(desktop);
  });
});
