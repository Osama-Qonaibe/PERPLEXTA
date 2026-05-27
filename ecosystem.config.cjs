module.exports = {
  apps: [{
    name: 'perplexta',
    script: './dist/server.mjs',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
