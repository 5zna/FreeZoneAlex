module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: '.',
      script: 'npx',
      args: 'browser-sync start --server --files "**/*.html,**/*.js,**/*.css" --port 3000 --no-notify --no-open',
      watch: false,
      windowsHide: true,
      env: { NODE_ENV: 'development' }
    },
    {
      name: 'backend',
      cwd: './server',
      script: 'npx',
      args: 'nodemon index.js',
      watch: false,
      env: { NODE_ENV: 'development' }
    }
  ]
};
