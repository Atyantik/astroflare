export const pagesWorkflow = (appName) => ({
  'runs-on': 'ubuntu-24.04',
  needs: ['migrate'],
  steps: [
    { name: 'Check out code', uses: 'actions/checkout@v4' },
    {
      name: 'Use Node',
      uses: 'actions/setup-node@v4',
      with: { 'node-version': 22 },
    },
    {
      name: 'Cache node_modules',
      uses: 'actions/cache@v3',
      with: {
        path: '**/node_modules',
        key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}",
        'restore-keys': '${{ runner.os }}-node-',
      },
    },
    { name: 'Install dependencies', run: 'npm install' },
    { name: 'Setup Wrangler', run: 'npm run setup' },
    {
      name: 'Download build artifacts',
      uses: 'actions/download-artifact@v4',
      with: {
        name: `${appName}-dist`,
        path: `./apps/${appName}/dist`,
      },
    },
    {
      name: `Deploy to @flarekit/${appName}`,
      uses: 'cloudflare/wrangler-action@v3',
      with: {
        accountId: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
        apiToken: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
        workingDirectory: `./apps/${appName}`,
        command: 'pages deploy ./dist',
      },
    },
  ],
});
