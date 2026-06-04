module.exports = {
  apps: [{
    name: 'perplexta',
    script: './dist/server.cjs',
    cwd: '/home/perplexta1/public_html',
    env: {
      APP_URL: 'https://perplexta.com',
      NODE_ENV: 'production'
    }
  }]
}
