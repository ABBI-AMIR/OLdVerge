import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {securityHeaders} from '../../server/security.mjs';

describe('deployment security headers', () => {
  it('protects static and SSR routes with matching headers', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    expect(config.routes[0]).toMatchObject({src:'/(.*)',continue:true,headers:securityHeaders});
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    expect(securityHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(securityHeaders['Content-Security-Policy']).toContain('https://challenges.cloudflare.com');
  });
});
