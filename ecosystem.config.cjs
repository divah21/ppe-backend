// PM2 process file for the Windows server. Secrets come from .env, never from here.
// Start or reload with: pm2 startOrReload ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'ppe-api',
      script: 'dist/app.js',
      cwd: __dirname,
      // One instance: rate limits and schedulers are in-process
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '700M',
      kill_timeout: 10000,
      // Windows cannot deliver SIGINT; PM2 sends a 'shutdown' message that app.js handles
      shutdown_with_message: true,
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',
        // Day bounds, budget years and CR- numbers use local time; pin it whatever the host zone
        TZ: 'Africa/Harare',
      },
    },
  ],
};
