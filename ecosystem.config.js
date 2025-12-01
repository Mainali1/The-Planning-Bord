module.exports = {
  apps: [
    {
      name: 'planning-bord-api',
      script: './backend/src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'planning-bord-email-worker',
      script: './backend/src/workers/emailWorker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'email'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'email'
      },
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/email-worker-error.log',
      out_file: './logs/email-worker-out.log',
      log_file: './logs/email-worker-combined.log',
      time: true
    },
    {
      name: 'planning-bord-inventory-worker',
      script: './backend/src/workers/inventoryWorker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'inventory'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'inventory'
      },
      watch: false,
      max_memory_restart: '400M',
      error_file: './logs/inventory-worker-error.log',
      out_file: './logs/inventory-worker-out.log',
      log_file: './logs/inventory-worker-combined.log',
      time: true
    },
    {
      name: 'planning-bord-report-worker',
      script: './backend/src/workers/reportWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'report'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'report'
      },
      watch: false,
      max_memory_restart: '600M',
      error_file: './logs/report-worker-error.log',
      out_file: './logs/report-worker-out.log',
      log_file: './logs/report-worker-combined.log',
      time: true
    },
    {
      name: 'planning-bord-file-worker',
      script: './backend/src/workers/fileWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'file'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'file'
      },
      watch: false,
      max_memory_restart: '800M',
      error_file: './logs/file-worker-error.log',
      out_file: './logs/file-worker-out.log',
      log_file: './logs/file-worker-combined.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/the-planning-bord.git',
      path: '/var/www/planning-bord',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};