// This file re-exports the configuration from vite.config.ts
// to solve a Vercel build issue where an empty .js config file causes an error.
import config from './vite.config.ts';
export default config;
