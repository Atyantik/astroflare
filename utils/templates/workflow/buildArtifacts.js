export const buildArtifacts = (appName) => ({
  name: `Archive ${appName} artifacts`,
  uses: 'actions/upload-artifact@v4',
  with: {
    name: `${appName}-dist`,
    path: `./apps/${appName}/dist`,
  },
});
