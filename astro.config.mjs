// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  // Server-rendered: /print and /q read a quotation at request time. The print route in
  // particular must be plain server HTML with no hydration, so the PDF is deterministic.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 4321 },
  devToolbar: { enabled: false },
  security: { checkOrigin: false }
});
