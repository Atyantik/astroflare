export const wranglerConfig = (appName) => ({
  $schema: '../../node_modules/wrangler/config-schema.json',
  name: `flarekit-${appName}`,
  pages_build_output_dir: './dist',
});
