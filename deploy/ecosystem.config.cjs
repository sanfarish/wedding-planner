// PM2 process file.
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save && pm2 startup
// Secrets (SESSION_SECRET) stay in the root .env file, which the app loads itself.
const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'wedding-planner',
      cwd: path.resolve(__dirname, '..'),
      script: 'server/dist/server.js',
      exec_mode: 'fork',
      instances: 1, // SQLite + in-memory login rate limiter: keep a single process
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3000,
        TZ: 'Asia/Jakarta',
      },
      max_memory_restart: '300M',
      kill_timeout: 10000,
      time: true,
    },
  ],
}
