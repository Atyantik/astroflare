export const updatedConfig = `
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persist: {
        path: '../../.wrangler/state/v3',
      },
    },
  }),
  security: {
    checkOrigin: false,
  },
  vite: {
    optimizeDeps: {
      include: ['@flarekit/database'],
    },
  },
});
`;
