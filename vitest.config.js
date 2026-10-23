import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Fast unit tests for the storefront code. Database tests use vitest.db.config.js (npm run test:db).
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/**/*.test.{js,ts}'],
    environment: 'node',
    setupFiles: ['./src/test-setup.js'],
  },
});
