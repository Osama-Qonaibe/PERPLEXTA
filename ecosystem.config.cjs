module.exports = {
  apps: [{
    name: 'perplexta',
    script: './dist/server.cjs',
    cwd: '/home/perplexta1/public_html',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/root/.pm2/logs/perplexta-error.log',
    out_file: '/root/.pm2/logs/perplexta-out.log'
  }]
}
